/**
 * Unit tests for buildPipelineDefinitionDag.
 * Pure module — no vscode dependency.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPipelineDefinitionDag,
} from "../pipelineDefinitionDetailRenderer";
import type { PipelineDetailFromApi } from "../../../api/types";

function makeDetail(steps: Record<string, unknown>[], triggers: unknown[] = []): PipelineDetailFromApi {
  return {
    name: "test-pipeline",
    version: 1,
    schema_version: 1,
    description: null,
    step_count: steps.length,
    content_hash: "abc",
    source_path: "pipelines/test.yaml",
    triggers: triggers as PipelineDetailFromApi["triggers"],
    args_schema: {},
    steps: steps as PipelineDetailFromApi["steps"],
  };
}

describe("buildPipelineDefinitionDag", () => {
  it("empty_steps_yields_empty_descriptor", () => {
    const detail = makeDetail([]);
    const result = buildPipelineDefinitionDag(detail);
    assert.deepEqual(result.elements, []);
    assert.deepEqual(result.argsByStep, {});
    assert.deepEqual(result.warnings, []);
  });

  it("single_engine_call_step_no_requires_yields_one_node_zero_edges", () => {
    const detail = makeDetail([
      { name: "fetch", engine: "inventory_reconcile", action: "run", args: { x: 1 }, requires: [] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    assert.equal(result.elements.length, 1);
    const node = result.elements[0] as { data: { id: string; name: string; label: string; kind: string } };
    assert.equal(node.data.id, "step_0");
    assert.equal(node.data.kind, "engine_call");
    assert.equal(node.data.label, "fetch\ninventory_reconcile.run");
    assert.deepEqual(result.warnings, []);
  });

  it("single_wait_for_event_step_yields_kind_wait_for_event_label_suffix", () => {
    const detail = makeDetail([
      { name: "wait", type: "wait_for_event", routing_key: "some.event", args: {}, requires: [] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    assert.equal(result.elements.length, 1);
    const node = result.elements[0] as { data: { id: string; label: string; kind: string } };
    assert.equal(node.data.kind, "wait_for_event");
    assert.ok(node.data.label.includes("\nwait_for_event"), `label should contain \\nwait_for_event, got: ${node.data.label}`);
  });

  it("linear_chain_a_b_c_yields_two_edges", () => {
    const detail = makeDetail([
      { name: "a", engine: "e", action: "a1", args: {}, requires: [] },
      { name: "b", engine: "e", action: "a2", args: {}, requires: ["a"] },
      { name: "c", engine: "e", action: "a3", args: {}, requires: ["b"] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    const nodes = result.elements.filter((el) => !("source" in (el as { data: Record<string, unknown> }).data));
    const edges = result.elements.filter((el) => "source" in (el as { data: Record<string, unknown> }).data);
    assert.equal(nodes.length, 3);
    assert.equal(edges.length, 2);
    const edgeData = edges.map((e) => (e as { data: { source: string; target: string } }).data);
    assert.ok(edgeData.some((e) => e.source === "step_0" && e.target === "step_1"), "edge step_0->step_1 missing");
    assert.ok(edgeData.some((e) => e.source === "step_1" && e.target === "step_2"), "edge step_1->step_2 missing");
  });

  it("diamond_dag_yields_4_nodes_4_edges", () => {
    const detail = makeDetail([
      { name: "a", engine: "e", action: "a1", args: {}, requires: [] },
      { name: "b", engine: "e", action: "a2", args: {}, requires: ["a"] },
      { name: "c", engine: "e", action: "a3", args: {}, requires: ["a"] },
      { name: "d", engine: "e", action: "a4", args: {}, requires: ["b", "c"] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    const nodes = result.elements.filter((el) => !("source" in (el as { data: Record<string, unknown> }).data));
    const edges = result.elements.filter((el) => "source" in (el as { data: Record<string, unknown> }).data);
    assert.equal(nodes.length, 4);
    assert.equal(edges.length, 4);
    // Verify all edge targets/sources are existing node ids
    const nodeIds = new Set(nodes.map((n) => (n as { data: { id: string } }).data.id));
    for (const edge of edges) {
      const e = (edge as { data: { source: string; target: string } }).data;
      assert.ok(nodeIds.has(e.source), `edge source ${e.source} not found in nodes`);
      assert.ok(nodeIds.has(e.target), `edge target ${e.target} not found in nodes`);
    }
  });

  it("dangling_requires_yields_warning_containing_both_names_no_crash", () => {
    const detail = makeDetail([
      { name: "b", engine: "e", action: "a2", args: {}, requires: ["ghost"] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    // Node for b still emitted
    const nodes = result.elements.filter((el) => !("source" in (el as { data: Record<string, unknown> }).data));
    assert.equal(nodes.length, 1);
    // No edge to ghost
    const edges = result.elements.filter((el) => "source" in (el as { data: Record<string, unknown> }).data);
    assert.equal(edges.length, 0);
    // Warning present
    assert.equal(result.warnings.length, 1);
    assert.ok(result.warnings[0].includes("b"), `warning should mention step 'b', got: ${result.warnings[0]}`);
    assert.ok(result.warnings[0].includes("ghost"), `warning should mention 'ghost', got: ${result.warnings[0]}`);
  });

  it("label_with_special_chars_preserved_no_escaping", () => {
    const detail = makeDetail([
      { name: 'step-"quoted"', engine: "e", action: "a1", args: {}, requires: [] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    const node = result.elements[0] as { data: { label: string } };
    // Should NOT contain double-escaped sequences
    assert.ok(!node.data.label.includes("\\n"), "label must not contain literal \\\\n");
    assert.ok(!node.data.label.includes("&quot;"), "label must not contain &quot; HTML entity");
    assert.ok(node.data.label.includes('"quoted"'), "original quotes must be preserved");
  });

  it("argsByStep_keyed_by_original_step_name_with_raw_args", () => {
    const args = { timeout: 30, mode: "fast" };
    const detail = makeDetail([
      { name: "my-step", engine: "e", action: "a1", args, requires: [] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    assert.ok("my-step" in result.argsByStep, "argsByStep should be keyed by original step name");
    assert.deepEqual(result.argsByStep["my-step"], args);
  });

  it("step_type_wait_for_event_without_engine_action_yields_kind_wait_for_event", () => {
    const detail = makeDetail([
      { name: "park", type: "wait_for_event", args: {}, requires: [] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    const node = result.elements[0] as { data: { kind: string } };
    assert.equal(node.data.kind, "wait_for_event");
  });

  it("step_without_type_and_without_engine_action_yields_kind_unknown", () => {
    const detail = makeDetail([
      { name: "mystery", args: {}, requires: [] },
    ]);
    const result = buildPipelineDefinitionDag(detail);
    const node = result.elements[0] as { data: { kind: string; label: string } };
    assert.equal(node.data.kind, "unknown");
    assert.ok(node.data.label.includes("\n<unknown>"), `label should end with \\n<unknown>, got: ${node.data.label}`);
  });
});
