/**
 * Tests for pipelineDefinitionDetailRenderer.
 * No vscode dependency — pure module.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  pipelineDefinitionHeaderColumns,
  buildPipelineDefinitionHeaderRows,
  pipelineDefinitionTriggersColumns,
  buildPipelineDefinitionTriggersSection,
} from "../pipelineDefinitionDetailRenderer";
import type { PipelineDetailFromApi } from "../../../api/types";

function makeDetail(overrides: Partial<PipelineDetailFromApi> = {}): PipelineDetailFromApi {
  return {
    name: "my-pipeline",
    version: 2,
    schema_version: 1,
    description: "A test pipeline",
    step_count: 0,
    triggers: [],
    args_schema: {},
    steps: [],
    content_hash: "deadbeef",
    source_path: "/pipelines/my-pipeline.yaml",
    ...overrides,
  };
}

describe("pipelineDefinitionHeaderColumns", () => {
  it("columns_match_spec", () => {
    assert.deepEqual(pipelineDefinitionHeaderColumns(), ["Field", "Value"]);
  });
});

describe("buildPipelineDefinitionHeaderRows", () => {
  it("header_rows_present_for_all_documented_fields", () => {
    const detail = makeDetail();
    const rows = buildPipelineDefinitionHeaderRows(detail);
    const ids = rows.map((r) => r.id);
    const expected = [
      "name",
      "version",
      "schema_version",
      "description",
      "step_count",
      "content_hash",
      "source_path",
    ];
    assert.deepEqual(ids, expected);
  });

  it("null_description_renders_empty_string", () => {
    const detail = makeDetail({ description: null });
    const rows = buildPipelineDefinitionHeaderRows(detail);
    const row = rows.find((r) => r.id === "description");
    assert.ok(row);
    assert.equal(row.cells[1].value, "");
  });

  it("version_is_badge_kind", () => {
    const detail = makeDetail({ version: 5 });
    const rows = buildPipelineDefinitionHeaderRows(detail);
    const row = rows.find((r) => r.id === "version");
    assert.ok(row);
    assert.equal(row.cells[1].kind, "badge");
    assert.equal(row.cells[1].value, "5");
  });
});

describe("pipelineDefinitionTriggersColumns", () => {
  it("columns_match_spec", () => {
    assert.deepEqual(pipelineDefinitionTriggersColumns(), ["Type", "Routing key", "Cron / Every", "Match"]);
  });
});

describe("buildPipelineDefinitionTriggersSection", () => {
  it("empty_triggers_yields_no_triggers_placeholder", () => {
    const detail = makeDetail({ triggers: [] });
    const section = buildPipelineDefinitionTriggersSection(detail);
    assert.equal(section.rows.length, 1);
    assert.equal(section.rows[0].id, "no-triggers");
    assert.equal(section.rows[0].cells[0].value, "No triggers");
  });

  it("one_mq_trigger_row_shows_type_and_routing_key", () => {
    const detail = makeDetail({
      triggers: [{ type: "mq", routing_key: "iam.employees.created" }],
    });
    const section = buildPipelineDefinitionTriggersSection(detail);
    assert.equal(section.rows.length, 1);
    assert.equal(section.rows[0].cells[0].value, "mq");
    assert.equal(section.rows[0].cells[1].value, "iam.employees.created");
  });

  it("trigger_with_match_renders_json", () => {
    const detail = makeDetail({
      triggers: [{ type: "mq", routing_key: "key", match: { env: "prod" } }],
    });
    const section = buildPipelineDefinitionTriggersSection(detail);
    assert.equal(section.rows[0].cells[3].value, '{"env":"prod"}');
  });

  it("trigger_with_null_match_renders_empty_string", () => {
    const detail = makeDetail({
      triggers: [{ type: "mq", routing_key: "key", match: null }],
    });
    const section = buildPipelineDefinitionTriggersSection(detail);
    assert.equal(section.rows[0].cells[3].value, "");
  });

  it("section_title_is_Triggers", () => {
    const detail = makeDetail({ triggers: [] });
    const section = buildPipelineDefinitionTriggersSection(detail);
    assert.equal(section.title, "Triggers");
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
      "pipelineDefinitionDetailRenderer.ts",
    );
    const src = fs.readFileSync(rendererPath, "utf-8");
    assert.ok(
      !src.includes("from \"vscode\"") && !src.includes("from 'vscode'"),
      "pipelineDefinitionDetailRenderer must not import vscode",
    );
  });
});
