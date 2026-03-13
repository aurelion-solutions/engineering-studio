import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapInitiativesToNodes } from "../initiativesMapper";
import type { InitiativeFromApi } from "../../../api/types";

function makeInitiative(
  overrides: Partial<InitiativeFromApi> = {},
): InitiativeFromApi {
  return {
    id: "init-uuid-00000001",
    access_fact_id: "fact-uuid-00000001",
    type: "requested",
    origin: "Created by HR workflow for new joiner onboarding",
    valid_from: "2026-04-17T04:00:00Z",
    valid_until: "2026-12-31T23:59:59Z",
    created_at: "2026-04-17T04:00:00Z",
    updated_at: "2026-04-17T04:00:00Z",
    ...overrides,
  };
}

describe("mapInitiativesToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapInitiativesToNodes([]), []);
  });

  it("full initiative maps all fields correctly", () => {
    const nodes = mapInitiativesToNodes([makeInitiative()]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.initiativeId, "init-uuid-00000001");
    assert.ok(node.label.includes("requested"));
    assert.ok(node.label.includes("Created by HR workflow"));
    assert.ok(node.description.includes("2026-04-17T04:00:00Z"));
    assert.ok(node.description.includes("2026-12-31T23:59:59Z"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("init-uuid-00000001"));
    assert.ok(tooltip.includes("fact-uuid-00000001"));
    assert.ok(tooltip.includes("requested"));
    assert.ok(tooltip.includes("Created by HR workflow"));
    assert.ok(tooltip.includes("2026-04-17T04:00:00Z"));
    assert.ok(tooltip.includes("2026-12-31T23:59:59Z"));
    assert.ok(tooltip.includes("updated_at"));
  });

  it("open-ended valid_until=null renders description without end timestamp", () => {
    const nodes = mapInitiativesToNodes([makeInitiative({ valid_until: null })]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    // description should show start but NOT a closing date
    assert.ok(node.description.includes("2026-04-17T04:00:00Z"));
    assert.ok(!node.description.includes("2026-12-31"));
    // tooltip should show (open) for valid_until
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("(open)"));
  });
});
