import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapArtifactBindingsToNodes } from "../artifactBindingsMapper";
import type { ArtifactBindingFromApi } from "../../../api/types";

function makeArtifactBinding(
  overrides: Partial<ArtifactBindingFromApi> = {},
): ArtifactBindingFromApi {
  return {
    id: "bind-uuid-00000001",
    artifact_id: "artf-uuid-00000001",
    access_fact_id: "fact-uuid-00000001",
    resource_id: "rsrc-uuid-00000001",
    account_id: "acct-uuid-00000001",
    created_at: "2026-04-17T03:00:00Z",
    ...overrides,
  };
}

describe("mapArtifactBindingsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapArtifactBindingsToNodes([]), []);
  });

  it("full binding maps all fields correctly", () => {
    const nodes = mapArtifactBindingsToNodes([makeArtifactBinding()]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.bindingId, "bind-uuid-00000001");
    assert.ok(node.label.includes("artf-uui"));
    assert.ok(node.label.includes("fact"));
    assert.ok(node.label.includes("resource"));
    assert.ok(node.label.includes("account"));
    assert.ok(node.description.includes("2026-04-17T03:00:00Z"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("bind-uuid-00000001"));
    assert.ok(tooltip.includes("artf-uuid-00000001"));
    assert.ok(tooltip.includes("fact-uuid-00000001"));
    assert.ok(tooltip.includes("rsrc-uuid-00000001"));
    assert.ok(tooltip.includes("acct-uuid-00000001"));
    assert.ok(tooltip.includes("2026-04-17T03:00:00Z"));
  });

  it("minimal binding with only access_fact_id handled", () => {
    const nodes = mapArtifactBindingsToNodes([
      makeArtifactBinding({ resource_id: null, account_id: null }),
    ]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.ok(node.label.includes("fact"));
    assert.ok(!node.label.includes("resource"));
    assert.ok(!node.label.includes("account"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(!tooltip.includes("resource_id"));
    assert.ok(!tooltip.includes("account_id"));
  });
});
