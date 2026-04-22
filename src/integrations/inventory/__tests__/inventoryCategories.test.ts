import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INVENTORY_CATEGORIES } from "../inventoryCategories";

describe("INVENTORY_CATEGORIES", () => {
  it("has exactly 15 unique keys", () => {
    assert.equal(INVENTORY_CATEGORIES.length, 15);
    const keys = INVENTORY_CATEGORIES.map((c) => c.key);
    const unique = new Set(keys);
    assert.equal(unique.size, 15, "All keys must be unique");
  });

  it("each fetcherName is a non-empty string", () => {
    for (const cat of INVENTORY_CATEGORIES) {
      assert.ok(
        typeof cat.fetcherName === "string" && cat.fetcherName.length > 0,
        `Category ${cat.key} must have a non-empty fetcherName`,
      );
    }
  });

  it("columns.name returns non-empty string for sample row per category", () => {
    const sampleRow = {
      id: "id-001",
      external_id: "ext-001",
      username: "user001",
      subject_id: "subj-001",
      artifact_id: "art-001",
      access_fact_id: "fact-001",
      kind: "employee",
      nhi_kind: "service_account",
      status: "active",
      plan_tier: "pro",
      risk_score: 0.5,
      usage_count: 5,
      employee_id: "emp-001",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-06-01T00:00:00Z",
      ingested_at: "2024-05-01T00:00:00Z",
    };
    for (const cat of INVENTORY_CATEGORIES) {
      let name = "";
      try {
        name = cat.columns.name(sampleRow);
      } catch {
        assert.fail(`Category ${cat.key} columns.name threw on sample row`);
      }
      assert.ok(
        typeof name === "string",
        `Category ${cat.key} columns.name should return a string`,
      );
    }
  });
});
