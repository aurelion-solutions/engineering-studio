import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapAccountsToNodes } from "../accountsMapper";
import type { AccountFromApi } from "../../../api/types";

function makeAccount(overrides: Partial<AccountFromApi> = {}): AccountFromApi {
  return {
    id: "acct-uuid-1",
    application_id: "app-uuid-1234-5678-abcd",
    username: "testuser",
    display_name: null,
    email: null,
    is_active: true,
    is_privileged: false,
    mfa_enabled: false,
    status: "active",
    subject_id: null,
    meta: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

describe("mapAccountsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapAccountsToNodes([]), []);
  });

  it("maps active account: label == username, description ends with 'active'", () => {
    const nodes = mapAccountsToNodes([makeAccount({ username: "alice", status: "active" })]);
    assert.strictEqual(nodes[0].label, "alice");
    assert.ok(nodes[0].description.endsWith("active"));
  });

  it("maps unknown-status account with null subject_id: tooltip contains (unbound) and 'unknown'", () => {
    const nodes = mapAccountsToNodes([
      makeAccount({ status: "unknown", subject_id: null }),
    ]);
    const tooltipText = nodes[0].tooltipLines.join("\n");
    assert.ok(tooltipText.includes("(unbound)"), "tooltip should contain (unbound)");
    assert.ok(tooltipText.includes("unknown"), "tooltip should contain unknown");
  });
});
