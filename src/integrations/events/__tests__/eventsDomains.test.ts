import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyEvent } from "../eventsDomains";

describe("classifyEvent", () => {
  it("classifies inventory.* as inventory", () => {
    assert.equal(classifyEvent("inventory.customer.created"), "inventory");
  });

  it("classifies reconciliation.* as capabilities", () => {
    assert.equal(classifyEvent("reconciliation.run.completed"), "capabilities");
  });

  it("classifies provisioning.* as capabilities", () => {
    assert.equal(classifyEvent("provisioning.task.started"), "capabilities");
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
