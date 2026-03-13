import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapAccessUsageFactsToNodes } from "../accessUsageFactsMapper";
import type { AccessUsageFactFromApi } from "../../../api/types";

function makeUsageFact(
  overrides: Partial<AccessUsageFactFromApi> = {},
): AccessUsageFactFromApi {
  return {
    id: "usage-uuid-00000001",
    access_fact_id: "fact-uuid-00000001",
    last_seen: "2026-04-17T09:45:00Z",
    usage_count: 5,
    window_from: "2026-04-17T09:00:00Z",
    window_to: "2026-04-17T10:00:00Z",
    created_at: "2026-04-17T07:00:00Z",
    ...overrides,
  };
}

describe("mapAccessUsageFactsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapAccessUsageFactsToNodes([]), []);
  });

  it("closed-window usage fact maps to label with count and last_seen short", () => {
    const nodes = mapAccessUsageFactsToNodes([makeUsageFact()]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.usageFactId, "usage-uuid-00000001");
    // label must contain "× " and a timestamp prefix
    assert.ok(node.label.includes("×"));
    assert.ok(node.label.includes("2026-04-17"));
    // description = "fact " + first 8 chars of access_fact_id
    assert.ok(node.description.includes("fact "));
    assert.ok(node.description.includes("fact-uui"));
    // all fields in tooltip
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("usage-uuid-00000001"));
    assert.ok(tooltip.includes("fact-uuid-00000001"));
    assert.ok(tooltip.includes("5"));
    assert.ok(tooltip.includes("2026-04-17T09:45:00Z"));
    assert.ok(tooltip.includes("2026-04-17T09:00:00Z"));
    // window_to shows the ISO timestamp (not open-ended)
    assert.ok(tooltip.includes("2026-04-17T10:00:00Z"));
    assert.ok(!tooltip.includes("(open-ended)"));
    assert.ok(tooltip.includes("2026-04-17T07:00:00Z")); // created_at
  });

  it("open-ended window renders (open-ended) in tooltip", () => {
    const nodes = mapAccessUsageFactsToNodes([
      makeUsageFact({ window_to: null }),
    ]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("(open-ended)"));
  });
});
