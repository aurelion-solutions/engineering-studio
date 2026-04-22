import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInventoryRows, inventoryColumns } from "../inventoryListRenderer";

describe("buildInventoryRows", () => {
  it("maps customers to 4-cell rows", () => {
    const items = [
      { id: "cust-1", external_id: "ext-001", plan_tier: "pro", updated_at: "2024-01-01T00:00:00Z" },
    ];
    const rows = buildInventoryRows("customers", items);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 4);
    // name cell should have external_id
    assert.ok(rows[0].cells[1].value === "ext-001", "name cell should be external_id");
  });

  it("maps subjects to 4-cell rows", () => {
    const items = [
      { id: "subj-1", external_id: "ext-002", kind: "employee", nhi_kind: null, updated_at: "2024-02-01T00:00:00Z" },
    ];
    const rows = buildInventoryRows("subjects", items);
    assert.equal(rows.length, 1);
    assert.ok(rows[0].cells[1].value === "ext-002", "name cell should be external_id");
  });

  it("falls back gracefully for unknown category", () => {
    const items = [
      { id: "x-1", external_id: "fallback", status: "ok", updated_at: "2024-03-01T00:00:00Z" },
    ];
    const rows = buildInventoryRows("unknownCategory", items);
    assert.equal(rows.length, 1);
    // Should not throw
  });
});

describe("inventoryColumns", () => {
  it("returns 4 column headers", () => {
    assert.equal(inventoryColumns().length, 4);
  });
});
