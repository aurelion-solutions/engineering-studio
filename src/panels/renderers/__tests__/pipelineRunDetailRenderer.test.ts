/**
 * Tests for pipelineRunDetailRenderer.
 * No vscode dependency — pure module.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  pipelineRunDetailHeaderColumns,
  buildPipelineRunDetailHeaderRows,
  pipelineRunDetailStepsColumns,
  buildPipelineRunDetailStepsSection,
  TERMINAL_RUN_STATUSES,
} from "../pipelineRunDetailRenderer";
import type { PipelineRunDetailFromApi, StepRunSummaryFromApi } from "../../../api/types";

function makeDetail(overrides: Partial<PipelineRunDetailFromApi> = {}): PipelineRunDetailFromApi {
  return {
    id: "run-uuid-1",
    pipeline_name: "my-pipeline",
    pipeline_version: 2,
    content_hash: "deadbeef",
    status: "running",
    trigger_source: "manual",
    current_step: "step-1",
    started_at: "2026-05-11T10:00:00Z",
    finished_at: null,
    error: null,
    created_at: "2026-05-11T09:59:00Z",
    updated_at: "2026-05-11T10:00:05Z",
    args: {},
    steps: [],
    ...overrides,
  };
}

function makeStep(overrides: Partial<StepRunSummaryFromApi> = {}): StepRunSummaryFromApi {
  return {
    id: "step-uuid-1",
    step_name: "fetch-data",
    attempt: 1,
    status: "running",
    started_at: "2026-05-11T10:00:01Z",
    finished_at: null,
    error: null,
    ...overrides,
  };
}

describe("pipelineRunDetailHeaderColumns", () => {
  it("columns_match_spec", () => {
    assert.deepEqual(pipelineRunDetailHeaderColumns(), ["Field", "Value"]);
  });
});

describe("buildPipelineRunDetailHeaderRows", () => {
  it("header_rows_include_all_documented_fields", () => {
    const detail = makeDetail();
    const rows = buildPipelineRunDetailHeaderRows(detail);
    const fieldIds = rows.map((r) => r.id);
    const expected = [
      "pipeline_name",
      "version",
      "status",
      "trigger_source",
      "current_step",
      "started_at",
      "finished_at",
      "created_at",
      "updated_at",
      "error",
      "content_hash",
      "args",
    ];
    assert.equal(rows.length, expected.length);
    assert.deepEqual(fieldIds, expected);
  });

  it("header_args_renders_as_pretty_json_with_json_cell_kind", () => {
    const detail = makeDetail({ args: { a: 1, b: [2] } });
    const rows = buildPipelineRunDetailHeaderRows(detail);
    const argsRow = rows.find((r) => r.id === "args");
    assert.ok(argsRow, "args row must exist");
    const cell = argsRow.cells[1];
    assert.equal(cell.kind, "json");
    assert.equal(cell.value, '{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
  });

  it("header_null_finished_at_renders_empty_string", () => {
    const detail = makeDetail({ finished_at: null });
    const rows = buildPipelineRunDetailHeaderRows(detail);
    const finishedRow = rows.find((r) => r.id === "finished_at");
    assert.ok(finishedRow, "finished_at row must exist");
    assert.equal(finishedRow.cells[1].value, "");
  });

  it("header_empty_args_renders_empty_object_literal", () => {
    const detail = makeDetail({ args: {} });
    const rows = buildPipelineRunDetailHeaderRows(detail);
    const argsRow = rows.find((r) => r.id === "args");
    assert.ok(argsRow);
    assert.equal(argsRow.cells[1].value, "{}");
  });
});

describe("pipelineRunDetailStepsColumns", () => {
  it("steps_section_columns_match_spec", () => {
    assert.deepEqual(pipelineRunDetailStepsColumns(), [
      "Step",
      "Attempt",
      "Status",
      "Started",
      "Finished",
      "Error",
    ]);
  });
});

describe("buildPipelineRunDetailStepsSection", () => {
  it("steps_section_one_row_per_step_in_order", () => {
    const steps = [
      makeStep({ id: "s1", step_name: "alpha" }),
      makeStep({ id: "s2", step_name: "beta" }),
      makeStep({ id: "s3", step_name: "gamma" }),
    ];
    const detail = makeDetail({ steps });
    const section = buildPipelineRunDetailStepsSection(detail);
    assert.equal(section.rows.length, 3);
    assert.equal(section.rows[0].id, "alpha");
    assert.equal(section.rows[1].id, "beta");
    assert.equal(section.rows[2].id, "gamma");
    assert.equal(section.rows[0].cells[0].value, "alpha");
  });

  it("steps_section_has_clickable_meta", () => {
    const detail = makeDetail({ steps: [makeStep()] });
    const section = buildPipelineRunDetailStepsSection(detail);
    assert.equal(section.meta?.clickable, "1");
    assert.equal(section.meta?.routingKey, "steps");
  });

  it("steps_section_empty_steps_yields_placeholder_row", () => {
    const detail = makeDetail({ steps: [] });
    const section = buildPipelineRunDetailStepsSection(detail);
    assert.equal(section.rows.length, 1);
    assert.equal(section.rows[0].id, "no-steps");
    assert.equal(section.rows[0].cells[0].value, "No steps yet");
  });

  it("steps_section_step_row_has_no_actions", () => {
    const steps = [makeStep({ id: "s1" })];
    const detail = makeDetail({ steps });
    const section = buildPipelineRunDetailStepsSection(detail);
    assert.equal(section.rows[0].actions, undefined);
  });

  it("steps_section_title_is_Steps", () => {
    const detail = makeDetail({ steps: [] });
    const section = buildPipelineRunDetailStepsSection(detail);
    assert.equal(section.title, "Steps");
  });
});

describe("TERMINAL_RUN_STATUSES", () => {
  it("terminal_set_contains_expected_statuses", () => {
    assert.ok(TERMINAL_RUN_STATUSES.has("completed"));
    assert.ok(TERMINAL_RUN_STATUSES.has("failed"));
    assert.ok(TERMINAL_RUN_STATUSES.has("failed_timeout"));
    assert.ok(TERMINAL_RUN_STATUSES.has("cancelled"));
  });

  it("terminal_set_does_not_contain_non_terminal_statuses", () => {
    assert.ok(!TERMINAL_RUN_STATUSES.has("pending"));
    assert.ok(!TERMINAL_RUN_STATUSES.has("running"));
    assert.ok(!TERMINAL_RUN_STATUSES.has("awaiting_event"));
    assert.ok(!TERMINAL_RUN_STATUSES.has("cancelling"));
  });
});

describe("no_vscode_import", () => {
  it("renderer_source_does_not_import_vscode", () => {
    // __dirname at runtime is out/panels/renderers/__tests__; resolve to src/
    const rendererPath = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "src",
      "panels",
      "renderers",
      "pipelineRunDetailRenderer.ts",
    );
    const src = fs.readFileSync(rendererPath, "utf-8");
    assert.ok(
      !src.includes("from \"vscode\"") && !src.includes("from 'vscode'"),
      "pipelineRunDetailRenderer must not import vscode",
    );
  });
});
