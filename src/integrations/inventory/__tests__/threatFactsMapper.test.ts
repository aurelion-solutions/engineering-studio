import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapThreatFactsToNodes } from "../threatFactsMapper";
import type { ThreatFactFromApi } from "../../../api/types";

function makeThreatFact(
  overrides: Partial<ThreatFactFromApi> = {},
): ThreatFactFromApi {
  return {
    id: "threat-uuid-00000001",
    subject_id: "subject-uuid-000001",
    account_id: "account-uuid-000001",
    risk_score: 0.75,
    active_indicators: ["account_takeover", "impossible_travel"],
    last_login_at: "2026-04-01T08:00:00Z",
    failed_auth_count: 3,
    observed_at: "2026-04-17T08:00:00Z",
    created_at: "2026-04-17T08:00:00Z",
    updated_at: "2026-04-17T09:00:00Z",
    ...overrides,
  };
}

describe("mapThreatFactsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapThreatFactsToNodes([]), []);
  });

  it("full threat fact maps with indicators and account", () => {
    const nodes = mapThreatFactsToNodes([makeThreatFact()]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.factId, "threat-uuid-00000001");
    // label: "risk 0.75 · subj subject-"
    assert.ok(node.label.includes("risk "));
    assert.ok(node.label.includes("0.75"));
    assert.ok(node.label.includes("subject-u"));
    // description: "2 indicators" (plural)
    assert.strictEqual(node.description, "2 indicators");
    // tooltip assertions
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("threat-uuid-00000001"));
    assert.ok(tooltip.includes("subject-uuid-000001"));
    assert.ok(tooltip.includes("account-uuid-000001"));
    assert.ok(tooltip.includes("0.75"));
    assert.ok(tooltip.includes("account_takeover"));
    assert.ok(tooltip.includes("impossible_travel"));
    assert.ok(tooltip.includes("2026-04-01T08:00:00Z")); // last_login_at
    assert.ok(tooltip.includes("3")); // failed_auth_count
    assert.ok(tooltip.includes("2026-04-17T08:00:00Z")); // observed_at
    assert.ok(tooltip.includes("2026-04-17T09:00:00Z")); // updated_at
    assert.ok(!tooltip.includes("(none)"));
    assert.ok(!tooltip.includes("(never observed)"));
  });

  it("null account, null last_login_at, empty indicators render placeholders", () => {
    const nodes = mapThreatFactsToNodes([
      makeThreatFact({
        account_id: null,
        last_login_at: null,
        active_indicators: [],
      }),
    ]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.description, "0 indicators");
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("(none)")); // account_id and active_indicators
    assert.ok(tooltip.includes("(never observed)")); // last_login_at
  });
});
