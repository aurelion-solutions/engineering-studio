/**
 * Tests for pipelineStepDetailRenderer.
 * No vscode dependency — pure module.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  pipelineStepDetailHeaderColumns,
  buildPipelineStepDetailHeaderRows,
} from "../pipelineStepDetailRenderer";
import type { StepRunDetailFromApi } from "../../../api/types";

function makeDetail(overrides: Partial<StepRunDetailFromApi> = {}): StepRunDetailFromApi {
  return {
    id: "step-uuid-1",
    step_name: "fetch-data",
    attempt: 1,
    status: "completed",
    started_at: "2026-05-11T10:00:01Z",
    finished_at: "2026-05-11T10:00:55Z",
    error: null,
    args: {},
    result: null,
    ...overrides,
  };
}

describe("pipelineStepDetailHeaderColumns", () => {
  it("header_columns_match_spec", () => {
    assert.deepEqual(pipelineStepDetailHeaderColumns(), ["Field", "Value"]);
  });
});

describe("buildPipelineStepDetailHeaderRows", () => {
  it("header_rows_include_all_documented_fields_in_order", () => {
    const detail = makeDetail();
    const rows = buildPipelineStepDetailHeaderRows(detail);
    const expected = [
      "step_name",
      "attempt",
      "status",
      "started_at",
      "finished_at",
      "error",
      "args",
      "result",
      "id",
    ];
    assert.equal(rows.length, expected.length);
    assert.deepEqual(rows.map((r) => r.id), expected);
  });

  it("header_args_renders_as_pretty_json_with_json_cell_kind", () => {
    const detail = makeDetail({ args: { a: 1, b: [2] } });
    const rows = buildPipelineStepDetailHeaderRows(detail);
    const argsRow = rows.find((r) => r.id === "args");
    assert.ok(argsRow, "args row must exist");
    const cell = argsRow.cells[1];
    assert.equal(cell.kind, "json");
    assert.equal(cell.value, '{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
  });

  it("header_empty_args_renders_empty_object_literal", () => {
    const detail = makeDetail({ args: {} });
    const rows = buildPipelineStepDetailHeaderRows(detail);
    const argsRow = rows.find((r) => r.id === "args");
    assert.ok(argsRow);
    assert.equal(argsRow.cells[1].value, "{}");
  });

  it("header_null_result_renders_empty_string", () => {
    const detail = makeDetail({ result: null });
    const rows = buildPipelineStepDetailHeaderRows(detail);
    const resultRow = rows.find((r) => r.id === "result");
    assert.ok(resultRow, "result row must exist");
    assert.equal(resultRow.cells[1].value, "");
  });

  it("header_result_object_renders_as_pretty_json_with_json_cell_kind", () => {
    const detail = makeDetail({ result: { ok: true, count: 5 } });
    const rows = buildPipelineStepDetailHeaderRows(detail);
    const resultRow = rows.find((r) => r.id === "result");
    assert.ok(resultRow, "result row must exist");
    const cell = resultRow.cells[1];
    assert.equal(cell.kind, "json");
    assert.equal(cell.value, '{\n  "ok": true,\n  "count": 5\n}');
  });

  it("header_null_error_renders_empty_string", () => {
    const detail = makeDetail({ error: null });
    const rows = buildPipelineStepDetailHeaderRows(detail);
    const errorRow = rows.find((r) => r.id === "error");
    assert.ok(errorRow, "error row must exist");
    assert.equal(errorRow.cells[1].value, "");
  });

  it("header_null_finished_at_renders_empty_string", () => {
    const detail = makeDetail({ finished_at: null });
    const rows = buildPipelineStepDetailHeaderRows(detail);
    const finishedRow = rows.find((r) => r.id === "finished_at");
    assert.ok(finishedRow, "finished_at row must exist");
    assert.equal(finishedRow.cells[1].value, "");
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
      "pipelineStepDetailRenderer.ts",
    );
    const src = fs.readFileSync(rendererPath, "utf-8");
    assert.ok(
      !src.includes("from \"vscode\"") && !src.includes("from 'vscode'"),
      "pipelineStepDetailRenderer must not import vscode",
    );
  });
});
