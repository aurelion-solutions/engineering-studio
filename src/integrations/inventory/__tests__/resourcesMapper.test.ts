import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapResourcesToNodes } from "../resourcesMapper";
import type { ResourceFromApi } from "../../../api/types";

function makeResource(overrides: Partial<ResourceFromApi> = {}): ResourceFromApi {
  return {
    id: "res-uuid-001",
    external_id: "res-ext-001",
    application_id: "app-uuid-001",
    kind: "database",
    parent_id: null,
    path: "/prod/db",
    description: "Main database",
    privilege_level: "admin",
    environment: "production",
    data_sensitivity: "pii",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

describe("mapResourcesToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapResourcesToNodes([]), []);
  });

  it("full resource maps all fields correctly", () => {
    const nodes = mapResourcesToNodes([makeResource()]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.resourceId, "res-uuid-001");
    assert.strictEqual(node.label, "res-ext-001");
    assert.ok(node.description.includes("database"));
    assert.ok(node.description.includes("admin"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("res-uuid-001"));
    assert.ok(tooltip.includes("app-uuid-001"));
    assert.ok(tooltip.includes("database"));
    assert.ok(tooltip.includes("production"));
    assert.ok(tooltip.includes("pii"));
    assert.ok(tooltip.includes("2026-01-02T00:00:00Z"));
  });

  it("null optionals handled — description shows em-dash for missing privilege_level", () => {
    const nodes = mapResourcesToNodes([
      makeResource({
        privilege_level: null,
        environment: null,
        data_sensitivity: null,
        parent_id: null,
        path: null,
      }),
    ]);
    const node = nodes[0];
    assert.ok(node.description.includes("—"));
    // Should not crash and description should have kind
    assert.ok(node.description.includes("database"));
  });
});
