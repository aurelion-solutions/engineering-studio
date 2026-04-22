import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildEventsDomainDefs } from "../eventsDefs";

describe("buildEventsDomainDefs", () => {
  it("returns exactly 3 domain definitions with expected keys", () => {
    const defs = buildEventsDomainDefs();
    assert.equal(defs.length, 3);
    const keys = defs.map((d) => d.key);
    assert.ok(keys.includes("inventory"), "Should include inventory");
    assert.ok(keys.includes("capabilities"), "Should include capabilities");
    assert.ok(keys.includes("platform"), "Should include platform");
  });
});
