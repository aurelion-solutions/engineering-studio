import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapAccessArtifactsToNodes } from "../accessArtifactsMapper";
import type { AccessArtifactFromApi } from "../../../api/types";

function makeAccessArtifact(
  overrides: Partial<AccessArtifactFromApi> = {},
): AccessArtifactFromApi {
  return {
    id: "artifact-uuid-001",
    application_id: "app-uuid-001",
    source_kind: "sap_role",
    external_id: "role-admin-001",
    payload: { name: "ADMIN", description: "Full admin role" },
    ingested_at: "2026-01-01T00:00:00Z",
    ingest_batch_id: "batch-2026-001",
    ...overrides,
  };
}

describe("mapAccessArtifactsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapAccessArtifactsToNodes([]), []);
  });

  it("full artifact maps all fields correctly", () => {
    const nodes = mapAccessArtifactsToNodes([makeAccessArtifact()]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.artifactId, "artifact-uuid-001");
    assert.strictEqual(node.label, "role-admin-001");
    assert.ok(node.description.includes("sap_role"));
    assert.ok(node.description.includes("2026-01-01T00:00:00Z"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("artifact-uuid-001"));
    assert.ok(tooltip.includes("app-uuid-001"));
    assert.ok(tooltip.includes("sap_role"));
    assert.ok(tooltip.includes("role-admin-001"));
    assert.ok(tooltip.includes("batch-2026-001"));
    assert.ok(tooltip.includes("2026-01-01T00:00:00Z"));
  });

  it("null ingest_batch_id handled — tooltip should not contain ingest_batch_id line", () => {
    const nodes = mapAccessArtifactsToNodes([
      makeAccessArtifact({ ingest_batch_id: null }),
    ]);
    assert.strictEqual(nodes.length, 1);
    const tooltip = nodes[0].tooltipLines.join("\n");
    assert.ok(!tooltip.includes("ingest_batch_id"));
  });
});
