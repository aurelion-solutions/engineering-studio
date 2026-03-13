import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectorIconColor } from "../connectorIcon";

describe("connectorIconColor", () => {
  it("returns 'charts.green' when is_online is true", () => {
    assert.strictEqual(connectorIconColor({ is_online: true }), "charts.green");
  });

  it("returns 'disabledForeground' when is_online is false", () => {
    assert.strictEqual(connectorIconColor({ is_online: false }), "disabledForeground");
  });
});
