/**
 * Unit tests for LiveSchemaCache.
 * Pure module — no vscode, no fetch, no shim required.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LiveSchemaCache } from "../liveSchemaCache.js";

describe("LiveSchemaCache", () => {
  it("initial_state_returns_bundled_and_hasLive_false", () => {
    const cache = new LiveSchemaCache();
    const bundled = { type: "bundled" };
    assert.equal(cache.hasLive(), false);
    assert.strictEqual(cache.getActiveSchema(bundled), bundled);
  });

  it("setLive_stores_schema_and_hasLive_returns_true", () => {
    const cache = new LiveSchemaCache();
    const live = { type: "live", version: 2 };
    cache.setLive(live);
    assert.equal(cache.hasLive(), true);
    assert.deepEqual(cache.getActiveSchema({ type: "bundled" }), live);
  });

  it("clearLive_resets_to_bundled_and_hasLive_false", () => {
    const cache = new LiveSchemaCache();
    const bundled = { type: "bundled" };
    cache.setLive({ type: "live" });
    cache.clearLive();
    assert.equal(cache.hasLive(), false);
    assert.strictEqual(cache.getActiveSchema(bundled), bundled);
  });

  it("setLive_undefined_throws_TypeError", () => {
    const cache = new LiveSchemaCache();
    assert.throws(
      () => cache.setLive(undefined),
      (err: unknown) => {
        assert.ok(err instanceof TypeError);
        assert.ok(err.message.includes("schema must be defined"));
        return true;
      },
    );
  });

  it("setLive_null_throws_TypeError", () => {
    const cache = new LiveSchemaCache();
    assert.throws(
      () => cache.setLive(null),
      (err: unknown) => {
        assert.ok(err instanceof TypeError);
        return true;
      },
    );
  });
});
