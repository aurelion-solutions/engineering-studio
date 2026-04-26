import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  llmModelColumns,
  buildLlmModelRows,
  buildLlmModelProfilesSection,
} from "../llmModelRenderer";
import type { LLMModelFromApi, LLMExecutionProfileFromApi } from "../../../api/types";

function makeModel(overrides: Partial<LLMModelFromApi> = {}): LLMModelFromApi {
  return {
    id: "model-1",
    name: "Test Model",
    description: "A test model",
    provider: "openai",
    local_path: null,
    endpoint_url: "https://api.openai.com",
    model_ref: "gpt-4",
    context_window: 8192,
    max_total_tokens: 16384,
    default_params: {},
    secret_id: null,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeProfile(
  overrides: Partial<LLMExecutionProfileFromApi> = {},
): LLMExecutionProfileFromApi {
  return {
    id: "profile-1",
    name: "Default",
    model_id: "model-1",
    param_overrides: { temperature: 0.7 },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("llmModelColumns", () => {
  it('returns ["Field", "Value"]', () => {
    assert.deepStrictEqual(llmModelColumns(), ["Field", "Value"]);
  });
});

describe("buildLlmModelRows", () => {
  it("covers all 14 fields", () => {
    const model = makeModel();
    const rows = buildLlmModelRows(model);
    assert.strictEqual(rows.length, 14, "Expected 14 rows for 14 model fields");
  });

  it("each row has two cells: kv key + text value", () => {
    const rows = buildLlmModelRows(makeModel());
    for (const row of rows) {
      assert.strictEqual(row.cells.length, 2);
      assert.strictEqual(row.cells[0].kind, "kv");
      assert.strictEqual(row.cells[1].kind, "text");
    }
  });

  it('default_params {} serializes as "{}" and does not throw', () => {
    const model = makeModel({ default_params: {} });
    const rows = buildLlmModelRows(model);
    const paramsRow = rows.find((r) => r.id === "kv-default_params");
    assert.ok(paramsRow, "default_params row must exist");
    assert.strictEqual(paramsRow.cells[1].value, "{}");
  });

  it("default_params with values serializes correctly", () => {
    const model = makeModel({ default_params: { temperature: 0.5, top_p: 0.9 } });
    const rows = buildLlmModelRows(model);
    const paramsRow = rows.find((r) => r.id === "kv-default_params");
    assert.ok(paramsRow);
    assert.strictEqual(
      paramsRow.cells[1].value,
      JSON.stringify({ temperature: 0.5, top_p: 0.9 }),
    );
  });

  it("null optional fields render as empty string", () => {
    const model = makeModel({
      description: null,
      local_path: null,
      endpoint_url: null,
      model_ref: null,
      context_window: null,
      max_total_tokens: null,
      secret_id: null,
    });
    const rows = buildLlmModelRows(model);
    const nullableFields = [
      "description",
      "local_path",
      "endpoint_url",
      "model_ref",
      "context_window",
      "max_total_tokens",
      "secret_id",
    ];
    for (const field of nullableFields) {
      const row = rows.find((r) => r.id === `kv-${field}`);
      assert.ok(row, `Row for ${field} must exist`);
      assert.strictEqual(row.cells[1].value, "", `${field} null should render as ""`);
    }
  });

  it("is_active renders as string 'true' or 'false'", () => {
    const activeRow = buildLlmModelRows(makeModel({ is_active: true })).find(
      (r) => r.id === "kv-is_active",
    );
    const inactiveRow = buildLlmModelRows(makeModel({ is_active: false })).find(
      (r) => r.id === "kv-is_active",
    );
    assert.strictEqual(activeRow?.cells[1].value, "true");
    assert.strictEqual(inactiveRow?.cells[1].value, "false");
  });
});

describe("buildLlmModelProfilesSection", () => {
  it("empty profiles → section with correct columns and empty rows", () => {
    const section = buildLlmModelProfilesSection([]);
    assert.strictEqual(section.title, "Execution Profiles");
    assert.deepStrictEqual(section.columns, [
      "id",
      "name",
      "param_overrides",
      "created_at",
    ]);
    assert.strictEqual(section.rows.length, 0);
  });

  it("two profiles → two rows", () => {
    const p1 = makeProfile({ id: "p1", name: "Alpha" });
    const p2 = makeProfile({ id: "p2", name: "Beta" });
    const section = buildLlmModelProfilesSection([p1, p2]);
    assert.strictEqual(section.rows.length, 2);
  });

  it("param_overrides is serialized as JSON string", () => {
    const profile = makeProfile({ param_overrides: { temperature: 0.7 } });
    const section = buildLlmModelProfilesSection([profile]);
    const paramsCell = section.rows[0].cells[2];
    assert.strictEqual(paramsCell.value, JSON.stringify({ temperature: 0.7 }));
  });

  it("row id is prefixed with 'profile-'", () => {
    const profile = makeProfile({ id: "abc-123" });
    const section = buildLlmModelProfilesSection([profile]);
    assert.strictEqual(section.rows[0].id, "profile-abc-123");
  });
});
