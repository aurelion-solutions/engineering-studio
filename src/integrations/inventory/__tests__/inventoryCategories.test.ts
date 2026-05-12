import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INVENTORY_CATEGORIES } from "../inventoryCategories";

describe("INVENTORY_CATEGORIES", () => {
  it("has exactly 14 unique keys", () => {
    assert.equal(INVENTORY_CATEGORIES.length, 14);
    const keys = INVENTORY_CATEGORIES.map((c) => c.key);
    const unique = new Set(keys);
    assert.equal(unique.size, 14, "All keys must be unique");
  });

  it("does not contain accessArtifacts, accessFacts, or accounts keys", () => {
    const keys = INVENTORY_CATEGORIES.map((c) => c.key);
    assert.ok(!keys.includes("accessArtifacts" as never), "accessArtifacts must be removed");
    assert.ok(!keys.includes("accessFacts" as never), "accessFacts must be removed");
    assert.ok(!keys.includes("accounts" as never), "accounts must be replaced by accountState");
  });

  it("contains accessState category with 3 tabs", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accessState");
    assert.ok(cat !== undefined, "accessState must be present");
    assert.ok(cat.tabs !== undefined, "accessState must have tabs");
    assert.equal(cat.tabs.length, 3, "accessState must have exactly 3 tabs");
    const tabKeys = cat.tabs.map((t) => t.key);
    assert.deepEqual(tabKeys, ["list", "incoming", "outgoing"]);
  });

  it("accessState tabs have correct labels", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accessState");
    assert.ok(cat?.tabs !== undefined);
    const labels = cat.tabs.map((t) => t.label);
    assert.deepEqual(labels, ["List", "Incoming", "Outgoing"]);
  });

  it("accessState tabs have valid fetcherNames", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accessState");
    assert.ok(cat?.tabs !== undefined);
    for (const tab of cat.tabs) {
      assert.ok(
        typeof tab.fetcherName === "string" && tab.fetcherName.length > 0,
        `Tab ${tab.key} must have a non-empty fetcherName`,
      );
    }
  });

  it("contains accountState category with 3 tabs", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
    assert.ok(cat !== undefined, "accountState must be present");
    assert.ok(cat.tabs !== undefined, "accountState must have tabs");
    assert.equal(cat.tabs.length, 3, "accountState must have exactly 3 tabs");
    const tabKeys = cat.tabs.map((t) => t.key);
    assert.deepEqual(tabKeys, ["list", "incoming", "outgoing"]);
  });

  it("accountState label is 'Accounts'", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
    assert.equal(cat?.label, "Accounts");
  });

  it("accountState tabs have correct labels", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
    assert.ok(cat?.tabs !== undefined);
    const labels = cat.tabs.map((t) => t.label);
    assert.deepEqual(labels, ["List", "Incoming", "Outgoing"]);
  });

  it("accountState tabs have correct fetcherNames", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
    assert.ok(cat?.tabs !== undefined);
    assert.equal(cat.tabs[0].fetcherName, "fetchAccountsForState");
    assert.equal(cat.tabs[1].fetcherName, "fetchAccountIncomingDeltaItems");
    assert.equal(cat.tabs[2].fetcherName, "fetchAccountOutgoingPlanItems");
  });

  it("accountState list tab has 7 richHeaders, Application first", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
    assert.ok(cat?.tabs !== undefined);
    const listTab = cat.tabs.find((t) => t.key === "list");
    assert.ok(listTab !== undefined);
    assert.equal(listTab.richHeaders.length, 7);
    assert.equal(listTab.richHeaders[0], "Application");
    assert.equal(listTab.richHeaders[1], "Username");
    assert.equal(listTab.richHeaders[2], "Status");
  });

  it("accountState incoming tab has 5 richHeaders, Application first", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
    assert.ok(cat?.tabs !== undefined);
    const incomingTab = cat.tabs.find((t) => t.key === "incoming");
    assert.ok(incomingTab !== undefined);
    assert.equal(incomingTab.richHeaders.length, 5);
    assert.equal(incomingTab.richHeaders[0], "Application");
    assert.equal(incomingTab.richHeaders[1], "Op");
  });

  it("accountState outgoing tab has 7 richHeaders, Application first", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
    assert.ok(cat?.tabs !== undefined);
    const outgoingTab = cat.tabs.find((t) => t.key === "outgoing");
    assert.ok(outgoingTab !== undefined);
    assert.equal(outgoingTab.richHeaders.length, 7);
    assert.equal(outgoingTab.richHeaders[0], "Application");
    assert.equal(outgoingTab.richHeaders[1], "Kind");
  });

  it("regular categories have non-empty fetcherName", () => {
    for (const cat of INVENTORY_CATEGORIES) {
      if (cat.key === "accessState" || cat.key === "accountState") { continue; }
      assert.ok(
        typeof cat.fetcherName === "string" && cat.fetcherName.length > 0,
        `Category ${cat.key} must have a non-empty fetcherName`,
      );
    }
  });

  it("accessState tab columns.name returns string for sample rows", () => {
    const cat = INVENTORY_CATEGORIES.find((c) => c.key === "accessState");
    assert.ok(cat?.tabs !== undefined);

    const listRow = { id: "fact-1", subject_id: "subj-1", action: "read", effect: "allow", created_at: "2024-01-01" };
    const incomingRow = { id: "delta-1", run_id: "run-1", entity_type: "account", operation: "add", status: "pending", subject_id: "subj-1", created_at: "2024-01-01" };
    const outgoingRow = { id: "item-1", plan_id: "plan-1", kind: "grant_role", application: "aws", target_descriptor: { role: "admin" }, execution_status: "proposed", created_at: "2024-01-01" };

    const sampleByTab: Record<string, unknown> = {
      list: listRow,
      incoming: incomingRow,
      outgoing: outgoingRow,
    };

    for (const tab of cat.tabs) {
      const row = sampleByTab[tab.key];
      let name = "";
      try {
        name = tab.columns.name(row);
      } catch {
        assert.fail(`Tab ${tab.key} columns.name threw on sample row`);
      }
      assert.ok(typeof name === "string", `Tab ${tab.key} columns.name must return string`);
    }
  });

  it("regular category columns.name returns string for sample row", () => {
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
      if (cat.key === "accessState" || cat.key === "accountState") { continue; }
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
