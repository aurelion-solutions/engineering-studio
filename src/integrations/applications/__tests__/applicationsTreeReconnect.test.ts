import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  shouldStartReconnect,
  shouldStopReconnect,
} from "../applicationsTreeReconnect";

// ─── shouldStartReconnect ────────────────────────────────────────────────────

describe("shouldStartReconnect", () => {
  it("returns true on 0→1 transition with no existing timer", () => {
    assert.strictEqual(shouldStartReconnect(true, false), true);
  });

  it("returns false when already on a failure streak (wasZero=false, no timer)", () => {
    assert.strictEqual(shouldStartReconnect(false, false), false);
  });

  it("returns false when already on a failure streak (wasZero=false, timer exists)", () => {
    assert.strictEqual(shouldStartReconnect(false, true), false);
  });

  it("returns false on 0→1 transition when timer already exists (defensive dedup)", () => {
    assert.strictEqual(shouldStartReconnect(true, true), false);
  });
});

// ─── shouldStopReconnect ─────────────────────────────────────────────────────

describe("shouldStopReconnect", () => {
  it("returns true when success resets failures to 0 and timer is held", () => {
    assert.strictEqual(shouldStopReconnect(0, true), true);
  });

  it("returns false when success fires but no timer exists (steady-state, no streak)", () => {
    assert.strictEqual(shouldStopReconnect(0, false), false);
  });

  it("returns false when still failing (failures > 0, timer exists)", () => {
    assert.strictEqual(shouldStopReconnect(3, true), false);
  });

  it("returns false when still failing (failures > 0, no timer)", () => {
    assert.strictEqual(shouldStopReconnect(1, false), false);
  });
});
