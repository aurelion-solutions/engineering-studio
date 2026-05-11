/**
 * Tests for pipelineDefinitionsListRenderer.
 * No vscode dependency — pure module.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  pipelineDefinitionsColumns,
  buildPipelineDefinitionsRows,
} from "../pipelineDefinitionsListRenderer";
import type { PipelineSummaryFromApi } from "../../../api/types";

function makeDef(overrides: Partial<PipelineSummaryFromApi> = {}): PipelineSummaryFromApi {
  return {
    name: "my-pipeline",
    version: 1,
    schema_version: 1,
    description: null,
    step_count: 3,
    triggers: [],
    ...overrides,
  };
}

describe("pipelineDefinitionsColumns", () => {
  it("columns_match_spec", () => {
    assert.deepEqual(pipelineDefinitionsColumns(), ["Name", "Version", "Triggers", "Steps"]);
  });
});

describe("buildPipelineDefinitionsRows", () => {
  it("empty_input_yields_empty_rows", () => {
    const rows = buildPipelineDefinitionsRows([]);
    assert.equal(rows.length, 0);
  });

  it("row_id_equals_def_name", () => {
    const def = makeDef({ name: "alpha-pipeline" });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].id, "alpha-pipeline");
  });

  it("row_meta_clickable_is_1", () => {
    const def = makeDef();
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].meta?.clickable, "1");
  });

  it("mq_trigger_single_uses_routing_key", () => {
    const def = makeDef({
      triggers: [{ type: "mq", routing_key: "iam.employees.created" }],
    });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].cells[2].value, "iam.employees.created");
  });

  it("schedule_trigger_cron_only_uses_cron", () => {
    const def = makeDef({
      triggers: [{ type: "schedule", cron: "0 0 * * *" }],
    });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].cells[2].value, "0 0 * * *");
  });

  it("schedule_trigger_every_only_uses_every", () => {
    const def = makeDef({
      triggers: [{ type: "schedule", every: "5m" }],
    });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].cells[2].value, "5m");
  });

  it("single_trigger_without_routing_or_schedule_falls_back_to_type", () => {
    const def = makeDef({
      triggers: [{ type: "manual" }],
    });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].cells[2].value, "manual");
  });

  it("multi_trigger_def_yields_comma_joined_types", () => {
    const def = makeDef({
      triggers: [
        { type: "mq", routing_key: "some.key" },
        { type: "schedule", cron: "0 0 * * *" },
        { type: "manual" },
      ],
    });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].cells[2].value, "mq, schedule, manual");
  });

  it("zero_triggers_yields_empty_trigger_cell", () => {
    const def = makeDef({ triggers: [] });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].cells[2].value, "");
  });

  it("step_count_rendered_in_steps_cell", () => {
    const def = makeDef({ step_count: 7 });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].cells[3].value, "7");
  });

  it("version_cell_is_badge_kind", () => {
    const def = makeDef({ version: 3 });
    const rows = buildPipelineDefinitionsRows([def]);
    assert.equal(rows[0].cells[1].kind, "badge");
    assert.equal(rows[0].cells[1].value, "3");
  });
});

describe("no_vscode_import", () => {
  it("renderer_source_does_not_import_vscode", () => {
    const rendererPath = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "src",
      "panels",
      "renderers",
      "pipelineDefinitionsListRenderer.ts",
    );
    const src = fs.readFileSync(rendererPath, "utf-8");
    assert.ok(
      !src.includes("from \"vscode\"") && !src.includes("from 'vscode'"),
      "pipelineDefinitionsListRenderer must not import vscode",
    );
  });
});
