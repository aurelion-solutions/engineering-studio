import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyEvent } from "../eventsDomains";

describe("classifyEvent", () => {
  it("classifies inventory.* as inventory", () => {
    assert.equal(classifyEvent("inventory.customer.created"), "inventory");
  });

  it("classifies inventory_reconcile.* as capabilities", () => {
    assert.equal(classifyEvent("inventory_reconcile.run.completed"), "capabilities");
  });

  it("classifies inventory_sync.* as capabilities", () => {
    assert.equal(classifyEvent("inventory_sync.apply.completed"), "capabilities");
  });

  it("classifies access_apply.* as capabilities", () => {
    assert.equal(classifyEvent("access_apply.task.started"), "capabilities");
  });

  it("classifies audit.* as platform (fallback)", () => {
    assert.equal(classifyEvent("audit.user.login"), "platform");
  });

  it("classifies connectors.* as platform (fallback)", () => {
    assert.equal(classifyEvent("connectors.instance.online"), "platform");
  });

  it("classifies unknown as platform", () => {
    assert.equal(classifyEvent("unknown.some.event"), "platform");
  });
});
