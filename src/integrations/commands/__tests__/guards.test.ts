import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isConnectorNode, isAppNode, isOpenDetailPanelArg } from "../guards";

describe("isConnectorNode", () => {
  it("returns true for valid connector node", () => {
    assert.strictEqual(
      isConnectorNode({ kind: "connector", appId: "app-1", instanceId: "abc" }),
      true,
    );
  });

  it("returns false for empty object", () => {
    assert.strictEqual(isConnectorNode({}), false);
  });

  it("returns false for null", () => {
    assert.strictEqual(isConnectorNode(null), false);
  });

  it("returns false for undefined", () => {
    assert.strictEqual(isConnectorNode(undefined), false);
  });

  it("returns false for number", () => {
    assert.strictEqual(isConnectorNode(42), false);
  });

  it("returns false for string", () => {
    assert.strictEqual(isConnectorNode("string"), false);
  });

  it("returns false for wrong kind", () => {
    assert.strictEqual(
      isConnectorNode({ kind: "app", appId: "app-1", instanceId: "abc" }),
      false,
    );
  });

  it("returns false for empty instanceId", () => {
    assert.strictEqual(
      isConnectorNode({ kind: "connector", appId: "app-1", instanceId: "" }),
      false,
    );
  });

  // O-4: discriminant-collision — kind wins
  it("returns false when kind is app even if instanceId is present", () => {
    assert.strictEqual(
      isConnectorNode({ kind: "app", appId: "x", instanceId: "y" }),
      false,
    );
  });
});

describe("isAppNode", () => {
  it("returns true for valid app node", () => {
    assert.strictEqual(
      isAppNode({ kind: "app", appId: "app-1" }),
      true,
    );
  });

  it("returns false for empty object", () => {
    assert.strictEqual(isAppNode({}), false);
  });

  it("returns false for null", () => {
    assert.strictEqual(isAppNode(null), false);
  });

  it("returns false for undefined", () => {
    assert.strictEqual(isAppNode(undefined), false);
  });

  it("returns false for number", () => {
    assert.strictEqual(isAppNode(42), false);
  });

  it("returns false for string", () => {
    assert.strictEqual(isAppNode("string"), false);
  });

  it("returns false for wrong kind", () => {
    assert.strictEqual(
      isAppNode({ kind: "connector", appId: "x" }),
      false,
    );
  });

  it("returns false for empty appId", () => {
    assert.strictEqual(isAppNode({ kind: "app", appId: "" }), false);
  });

  // O-4: discriminant-collision — kind wins
  it("returns true for app node that also has instanceId", () => {
    assert.strictEqual(
      isAppNode({ kind: "app", appId: "x", instanceId: "y" }),
      true,
    );
  });
});

describe("isOpenDetailPanelArg", () => {
  it("returns true for valid application arg", () => {
    assert.strictEqual(
      isOpenDetailPanelArg({ kind: "application", ctxKey: "app-1", appId: "app-1", appName: "Billing" }),
      true,
    );
  });

  it("returns true for valid inventory arg", () => {
    assert.strictEqual(
      isOpenDetailPanelArg({ kind: "inventory", ctxKey: "customers", categoryKey: "customers", label: "Customers" }),
      true,
    );
  });

  it("returns true for valid events arg", () => {
    assert.strictEqual(
      isOpenDetailPanelArg({ kind: "events", ctxKey: "inventory", domain: "inventory" }),
      true,
    );
  });

  it("returns true for valid logs arg", () => {
    assert.strictEqual(
      isOpenDetailPanelArg({ kind: "logs", ctxKey: "error", minLevel: "error" }),
      true,
    );
  });

  it("returns false for bad kind", () => {
    assert.strictEqual(
      isOpenDetailPanelArg({ kind: "unknown", ctxKey: "x" }),
      false,
    );
  });

  it("returns false for missing ctxKey", () => {
    assert.strictEqual(
      isOpenDetailPanelArg({ kind: "events", domain: "platform" }),
      false,
    );
  });
});
