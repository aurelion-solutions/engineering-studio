/**
 * Unit tests for buildPipelineRunDag — run-DAG builder.
 * Pure module — no vscode dependency.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPipelineRunDag } from "../pipelineRunDetailRenderer";
import type {
  PipelineRunDetailFromApi,
  PipelineDetailFromApi,
  StepRunSummaryFromApi,
  StepRunStatus,
} from "../../../api/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRun(
  runId: string,
  steps: Array<Partial<StepRunSummaryFromApi> & { step_name: string }>,
): PipelineRunDetailFromApi {
  return {
    id: runId,
    pipeline_name: "test-pipe",
    pipeline_version: 1,
    content_hash: "run-hash",
    status: "running",
    trigger_source: "manual",
    current_step: null,
    started_at: "2026-01-01T00:00:00Z",
    finished_at: null,
    error: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    args: {},
    steps: steps.map((s, i) => ({
      id: s.id ?? `step-id-${i}`,
      step_name: s.step_name,
      attempt: s.attempt ?? 1,
      status: s.status ?? "completed",
      started_at: s.started_at ?? null,
      finished_at: s.finished_at ?? null,
      error: s.error ?? null,
    })),
  };
}

function makeDefinition(
  steps: Array<{
    name: string;
    requires?: string[];
    engine?: string;
    action?: string;
    type?: string;
    args?: Record<string, unknown>;
  }>,
): PipelineDetailFromApi {
  return {
    name: "test-pipe",
    version: 1,
    schema_version: 1,
    description: null,
    step_count: steps.length,
    content_hash: "def-hash",
    source_path: "pipelines/test.yaml",
    triggers: [],
    args_schema: {},
    steps: steps.map((s) => ({
      name: s.name,
      engine: s.engine ?? "engine",
      action: s.action ?? "action",
      type: s.type,
      args: s.args ?? {},
      requires: s.requires ?? [],
    })) as PipelineDetailFromApi["steps"],
  };
}

function getNodes(result: ReturnType<typeof buildPipelineRunDag>) {
  return result.elements.filter(
    (el) => !("source" in (el as { data: Record<string, unknown> }).data),
  ) as Array<{ data: { id: string; name: string; label: string; kind: string; status?: string } }>;
}

function getEdges(result: ReturnType<typeof buildPipelineRunDag>) {
  return result.elements.filter(
    (el) => "source" in (el as { data: Record<string, unknown> }).data,
  ) as Array<{ data: { id: string; source: string; target: string } }>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildPipelineRunDag", () => {
  it("all_steps_completed_3_step_fan_in", () => {
    // 3-step fan-in: A, B both require nothing; C requires A and B
    const run = makeRun("run-1", [
      { step_name: "A", status: "completed", id: "id-A" },
      { step_name: "B", status: "completed", id: "id-B" },
      { step_name: "C", status: "completed", id: "id-C" },
    ]);
    const def = makeDefinition([
      { name: "A" },
      { name: "B" },
      { name: "C", requires: ["A", "B"] },
    ]);

    const result = buildPipelineRunDag(run, def);
    const nodes = getNodes(result);
    const edges = getEdges(result);

    assert.equal(nodes.length, 3, "must emit 3 nodes");
    assert.equal(edges.length, 2, "must emit 2 edges (A→C, B→C)");
    assert.ok(result.warnings.length === 0, "no warnings");

    for (const node of nodes) {
      assert.equal(node.data.status, "completed", `node '${node.data.name}' status must be completed`);
    }

    // Check that argsByStep uses run-step data (step_id populated)
    const argsA = result.argsByStep["A"] as Record<string, unknown>;
    assert.equal(argsA["step_id"], "id-A");
    assert.equal(argsA["status"], "completed");
  });

  it("mixed_statuses_fan_out", () => {
    // Fan-out: start → [branch-run (running), branch-fail (failed)]; pending-step downstream
    const run = makeRun("run-2", [
      { step_name: "start", status: "completed", id: "id-start" },
      { step_name: "branch-run", status: "running", id: "id-run" },
      { step_name: "branch-fail", status: "failed", id: "id-fail" },
    ]);
    const def = makeDefinition([
      { name: "start" },
      { name: "branch-run", requires: ["start"] },
      { name: "branch-fail", requires: ["start"] },
      { name: "pending-step", requires: ["branch-run", "branch-fail"] },
    ]);

    const result = buildPipelineRunDag(run, def);
    const nodes = getNodes(result);

    assert.equal(nodes.length, 4);
    assert.ok(result.warnings.length === 0);

    const byName = Object.fromEntries(nodes.map((n) => [n.data.name, n.data]));
    assert.equal(byName["start"]?.status, "completed");
    assert.equal(byName["branch-run"]?.status, "running");
    assert.equal(byName["branch-fail"]?.status, "failed");
    // pending-step has no run row — status omitted from node data
    assert.equal(
      byName["pending-step"]?.status,
      undefined,
      "definition-only step must have status omitted (undefined)",
    );
  });

  it("definition_only_step_no_run_row_gets_pending_sentinel", () => {
    // Definition has A, B, C; run only has A and B. C is pending downstream.
    // C carries its planned definition_args so click-on-orphan can display them.
    const run = makeRun("run-3", [
      { step_name: "A", status: "completed", id: "id-A" },
      { step_name: "B", status: "running", id: "id-B" },
    ]);
    const def = makeDefinition([
      { name: "A" },
      { name: "B", requires: ["A"] },
      { name: "C", requires: ["B"], args: { foo: 42, bar: "baz" } },
    ]);

    const result = buildPipelineRunDag(run, def);
    const nodes = getNodes(result);

    assert.equal(nodes.length, 3);
    assert.ok(result.warnings.length === 0);

    const nodeC = nodes.find((n) => n.data.name === "C");
    assert.ok(nodeC !== undefined, "node C must be emitted");
    assert.equal(nodeC!.data.status, undefined, "C node must not carry status");

    const argsC = result.argsByStep["C"] as Record<string, unknown>;
    assert.equal(argsC["step_id"], null, "C sentinel step_id must be null");
    assert.equal(argsC["status"], "pending");
    assert.equal(argsC["attempt"], 0);
    assert.equal(argsC["error"], null);
    assert.equal(argsC["started_at"], null);
    assert.equal(argsC["finished_at"], null);
    assert.deepEqual(argsC["definition_args"], { foo: 42, bar: "baz" });
  });

  it("run_only_step_drift_skipped_with_warning", () => {
    // Z exists in run.steps but not in definition — drift case
    const run = makeRun("run-4", [
      { step_name: "A", status: "completed", id: "id-A" },
      { step_name: "Z", status: "failed", id: "id-Z" },
    ]);
    const def = makeDefinition([{ name: "A" }]);

    const result = buildPipelineRunDag(run, def);
    const nodes = getNodes(result);

    assert.ok(!nodes.some((n) => n.data.name === "Z"), "Z must not appear as a node");
    assert.equal(nodes.length, 1, "only A must be emitted");
    assert.equal(result.warnings.length, 1, "exactly one warning for drift step Z");
    assert.ok(result.warnings[0].includes("'Z'"), `warning must mention 'Z', got: ${result.warnings[0]}`);
    assert.ok(
      result.warnings[0].includes("content_hash drift"),
      `warning must mention 'content_hash drift', got: ${result.warnings[0]}`,
    );
  });

  it("multiple_attempts_latest_attempt_wins", () => {
    // Two rows for step A: attempt 1 = aborted, attempt 2 = running
    const run = makeRun("run-5", [
      { step_name: "A", attempt: 1, status: "aborted", id: "id-A-1" },
      { step_name: "A", attempt: 2, status: "running", id: "id-A-2" },
    ]);
    const def = makeDefinition([{ name: "A" }]);

    const result = buildPipelineRunDag(run, def);
    const nodes = getNodes(result);

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].data.status, "running", "attempt 2 (running) must win");

    const argsA = result.argsByStep["A"] as Record<string, unknown>;
    assert.equal(argsA["step_id"], "id-A-2");
    assert.equal(argsA["attempt"], 2);
    assert.equal(argsA["status"], "running");
  });

  it("empty_run_steps_all_definition_nodes_pending_edges_present", () => {
    // Brand-new run — run.steps is empty
    const run = makeRun("run-6", []);
    const def = makeDefinition([
      { name: "A" },
      { name: "B", requires: ["A"] },
    ]);

    const result = buildPipelineRunDag(run, def);
    const nodes = getNodes(result);
    const edges = getEdges(result);

    assert.equal(nodes.length, 2);
    assert.equal(edges.length, 1, "edge A→B must be present");
    assert.ok(result.warnings.length === 0, "no warnings for empty run");

    for (const node of nodes) {
      assert.equal(
        node.data.status,
        undefined,
        `node '${node.data.name}' must have no status when run has no steps`,
      );
    }

    const argsA = result.argsByStep["A"] as Record<string, unknown>;
    const argsB = result.argsByStep["B"] as Record<string, unknown>;
    assert.equal(argsA["status"], "pending");
    assert.equal(argsB["status"], "pending");
  });

  it("dangling_requires_in_definition_yields_warning", () => {
    // Step B requires Q which doesn't exist in definition
    const run = makeRun("run-7", [
      { step_name: "B", status: "failed", id: "id-B" },
    ]);
    const def = makeDefinition([
      { name: "B", requires: ["Q"] },
    ]);

    const result = buildPipelineRunDag(run, def);
    const edges = getEdges(result);

    assert.equal(edges.length, 0, "no edges — Q is missing from definition");
    assert.ok(result.warnings.length > 0, "must have at least one warning");
    const w = result.warnings.find((x) => x.includes("'B'") && x.includes("'Q'"));
    assert.ok(w !== undefined, `warning must mention B and Q, got: ${JSON.stringify(result.warnings)}`);
  });

  it("status_mapping_all_8_enum_values_round_trip", () => {
    const statuses: StepRunStatus[] = [
      "pending",
      "running",
      "awaiting_event",
      "completed",
      "failed",
      "failed_timeout",
      "aborted",
      "cancelled",
    ];

    for (const status of statuses) {
      const run = makeRun(`run-status-${status}`, [
        { step_name: "X", status, id: `id-X-${status}` },
      ]);
      const def = makeDefinition([{ name: "X" }]);
      const result = buildPipelineRunDag(run, def);
      const nodes = getNodes(result);

      assert.equal(nodes.length, 1);
      assert.equal(
        nodes[0].data.status,
        status,
        `status '${status}' must round-trip through buildPipelineRunDag → node data`,
      );

      const argsX = result.argsByStep["X"] as Record<string, unknown>;
      assert.equal(
        argsX["status"],
        status,
        `status '${status}' must round-trip through buildPipelineRunDag → argsByStep`,
      );
    }
  });
});
