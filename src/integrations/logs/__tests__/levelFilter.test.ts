import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { levelsForMinimum } from "../levelFilter";

describe("levelsForMinimum", () => {
  it("debug returns null (all levels)", () => {
    assert.equal(levelsForMinimum("debug"), null);
  });

  it("info returns info, warning, error, critical", () => {
    const levels = levelsForMinimum("info");
    assert.ok(levels !== null);
    assert.ok(levels.includes("info"));
    assert.ok(levels.includes("warning"));
    assert.ok(levels.includes("error"));
    assert.ok(levels.includes("critical"));
    assert.equal(levels.length, 4);
  });

  it("warning returns warning, error, critical", () => {
    const levels = levelsForMinimum("warning");
    assert.ok(levels !== null);
    assert.ok(levels.includes("warning"));
    assert.ok(levels.includes("error"));
    assert.ok(levels.includes("critical"));
    assert.equal(levels.length, 3);
  });

  it("error returns error, critical", () => {
    const levels = levelsForMinimum("error");
    assert.ok(levels !== null);
    assert.ok(levels.includes("error"));
    assert.ok(levels.includes("critical"));
    assert.equal(levels.length, 2);
  });
});
