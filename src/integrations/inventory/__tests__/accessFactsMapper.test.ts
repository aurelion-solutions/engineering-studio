import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapAccessFactsToNodes } from "../accessFactsMapper";
import type { AccessFactFromApi } from "../../../api/types";

function makeAccessFact(overrides: Partial<AccessFactFromApi> = {}): AccessFactFromApi {
  return {
    id: "fact-uuid-00000001",
    subject_id: "subj-uuid-00000001",
    account_id: "acct-uuid-00000001",
    resource_id: "rsrc-uuid-00000001",
    action: "read",
    effect: "allow",
    valid_from: "2026-01-01T00:00:00Z",
    valid_until: "2027-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("mapAccessFactsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapAccessFactsToNodes([]), []);
  });

  it("full fact maps all fields correctly", () => {
    const nodes = mapAccessFactsToNodes([makeAccessFact()]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.factId, "fact-uuid-00000001");
    assert.ok(node.label.includes("subj-uui"));
    assert.ok(node.label.includes("read"));
    assert.ok(node.label.includes("[allow]"));
    assert.ok(node.description.includes("rsrc-uui"));
    assert.ok(node.description.includes("until 2027-01-01T00:00:00Z"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("fact-uuid-00000001"));
    assert.ok(tooltip.includes("subj-uuid-00000001"));
    assert.ok(tooltip.includes("acct-uuid-00000001"));
    assert.ok(tooltip.includes("rsrc-uuid-00000001"));
    assert.ok(tooltip.includes("read"));
    assert.ok(tooltip.includes("allow"));
    assert.ok(tooltip.includes("2026-01-01T00:00:00Z"));
    assert.ok(tooltip.includes("2027-01-01T00:00:00Z"));
  });

  it("null valid_until and account_id handled", () => {
    const nodes = mapAccessFactsToNodes([
      makeAccessFact({ valid_until: null, account_id: null }),
    ]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.ok(node.description.includes("open"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(!tooltip.includes("account_id"));
    assert.ok(!tooltip.includes("valid_until"));
  });
});
