import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLogLevelDefs } from "../logLevelDefs";

describe("buildLogLevelDefs", () => {
  it("returns exactly 4 level definitions with expected keys", () => {
    const defs = buildLogLevelDefs();
    assert.equal(defs.length, 4);
    const keys = defs.map((d) => d.key);
    assert.ok(keys.includes("debug"), "Should include debug");
    assert.ok(keys.includes("info"), "Should include info");
    assert.ok(keys.includes("warning"), "Should include warning");
    assert.ok(keys.includes("error"), "Should include error");
  });
});
