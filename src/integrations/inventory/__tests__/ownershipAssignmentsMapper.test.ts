import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapOwnershipAssignmentsToNodes } from "../ownershipAssignmentsMapper";
import type { OwnershipAssignmentFromApi } from "../../../api/types";

function makeAssignment(
  overrides: Partial<OwnershipAssignmentFromApi> = {},
): OwnershipAssignmentFromApi {
  return {
    id: "assign-uuid-00000001",
    subject_id: "subj-uuid-00000001",
    resource_id: "res-uuid-00000001",
    account_id: null,
    kind: "primary",
    created_at: "2026-04-17T06:00:00Z",
    ...overrides,
  };
}

describe("mapOwnershipAssignmentsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapOwnershipAssignmentsToNodes([]), []);
  });

  it("resource-side assignment maps to res: short-id label", () => {
    const nodes = mapOwnershipAssignmentsToNodes([makeAssignment()]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.assignmentId, "assign-uuid-00000001");
    assert.ok(node.label.includes("primary"));
    assert.ok(node.label.includes("res:"));
    assert.ok(node.label.includes("res-uuid"));
    assert.ok(node.description.includes("subj-uui"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("assign-uuid-00000001"));
    assert.ok(tooltip.includes("subj-uuid-00000001"));
    assert.ok(tooltip.includes("primary"));
    assert.ok(tooltip.includes("res-uuid-00000001"));
    assert.ok(tooltip.includes("(n/a)")); // account_id is null
    assert.ok(tooltip.includes("2026-04-17T06:00:00Z"));
  });

  it("account-side assignment maps to acc: short-id label", () => {
    const nodes = mapOwnershipAssignmentsToNodes([
      makeAssignment({
        resource_id: null,
        account_id: "acc-uuid-00000001",
        kind: "technical",
      }),
    ]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.ok(node.label.includes("technical"));
    assert.ok(node.label.includes("acc:"));
    assert.ok(node.label.includes("acc-uuid"));
    const tooltip = node.tooltipLines.join("\n");
    assert.ok(tooltip.includes("acc-uuid-00000001"));
    assert.ok(tooltip.includes("(n/a)")); // resource_id is null
  });
});
