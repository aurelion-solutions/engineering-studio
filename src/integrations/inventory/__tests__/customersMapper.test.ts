import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapCustomersToNodes } from "../customersMapper";
import type { CustomerFromApi } from "../../../api/types";

function makeCustomer(overrides: Partial<CustomerFromApi> = {}): CustomerFromApi {
  return {
    id: "cust-uuid-1",
    external_id: "ext-001",
    email_verified: false,
    tenant_id: null,
    tenant_role: null,
    plan_tier: null,
    mfa_enabled: true,
    is_locked: false,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

describe("mapCustomersToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapCustomersToNodes([]), []);
  });

  it("sets label to external_id", () => {
    const nodes = mapCustomersToNodes([makeCustomer({ external_id: "my-customer" })]);
    assert.strictEqual(nodes[0].label, "my-customer");
  });

  it("sets description to plan_tier when present", () => {
    const nodes = mapCustomersToNodes([makeCustomer({ plan_tier: "pro" })]);
    assert.strictEqual(nodes[0].description, "pro");
  });

  it("sets description to empty string when plan_tier is null", () => {
    const nodes = mapCustomersToNodes([makeCustomer({ plan_tier: null })]);
    assert.strictEqual(nodes[0].description, "");
  });

  it("tooltip lines contain customer_id", () => {
    const nodes = mapCustomersToNodes([makeCustomer({ id: "cust-uuid-1" })]);
    const tooltipText = nodes[0].tooltipLines.join("\n");
    assert.ok(tooltipText.includes("cust-uuid-1"));
  });

  it("tooltip lines contain mfa_enabled and is_locked", () => {
    const nodes = mapCustomersToNodes([makeCustomer({ mfa_enabled: false, is_locked: true })]);
    const tooltipText = nodes[0].tooltipLines.join("\n");
    assert.ok(tooltipText.includes("mfa_enabled"));
    assert.ok(tooltipText.includes("is_locked"));
  });

  it("preserves order across multiple customers", () => {
    const customers = [
      makeCustomer({ id: "a", external_id: "first" }),
      makeCustomer({ id: "b", external_id: "second" }),
    ];
    const nodes = mapCustomersToNodes(customers);
    assert.strictEqual(nodes[0].label, "first");
    assert.strictEqual(nodes[1].label, "second");
  });
});
