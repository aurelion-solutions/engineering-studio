import { describe, it } from "node:test";
import assert from "node:assert/strict";
// Import from pure utils module (no vscode dependency) so tests run outside VS Code host
import { computeNextNewestTs } from "../streamerUtils";

// Minimal event shape — only timestamp is required by computeNextNewestTs
function makeEvent(timestamp: string): { timestamp: string } {
  return { timestamp };
}

describe("computeNextNewestTs", () => {
  it("returns currentNewestTs unchanged for an empty batch (asc)", () => {
    assert.strictEqual(
      computeNextNewestTs("2024-01-01T00:00:00Z", [], "asc"),
      "2024-01-01T00:00:00Z",
    );
  });

  it("returns currentNewestTs unchanged for an empty batch (desc)", () => {
    assert.strictEqual(
      computeNextNewestTs("2024-01-01T00:00:00Z", [], "desc"),
      "2024-01-01T00:00:00Z",
    );
  });

  it("returns undefined unchanged for empty batch when currentNewestTs is undefined", () => {
    assert.strictEqual(
      computeNextNewestTs(undefined, [], "asc"),
      undefined,
    );
  });

  it("returns last timestamp for ASC batch (incremental path)", () => {
    const batch = [
      makeEvent("2024-01-01T00:00:01Z"),
      makeEvent("2024-01-01T00:00:02Z"),
      makeEvent("2024-01-01T00:00:03Z"),
    ];
    assert.strictEqual(
      computeNextNewestTs("2024-01-01T00:00:00Z", batch, "asc"),
      "2024-01-01T00:00:03Z",
    );
  });

  it("returns first timestamp for DESC batch (seed path — first = newest before reverse)", () => {
    const batch = [
      makeEvent("2024-01-01T00:00:03Z"), // newest (first in DESC)
      makeEvent("2024-01-01T00:00:02Z"),
      makeEvent("2024-01-01T00:00:01Z"),
    ];
    assert.strictEqual(
      computeNextNewestTs(undefined, batch, "desc"),
      "2024-01-01T00:00:03Z",
    );
  });

  it("returns the single event timestamp for a single-event ASC batch", () => {
    const batch = [makeEvent("2024-06-15T12:00:00Z")];
    assert.strictEqual(
      computeNextNewestTs(undefined, batch, "asc"),
      "2024-06-15T12:00:00Z",
    );
  });

  it("returns the single event timestamp for a single-event DESC batch", () => {
    const batch = [makeEvent("2024-06-15T12:00:00Z")];
    assert.strictEqual(
      computeNextNewestTs(undefined, batch, "desc"),
      "2024-06-15T12:00:00Z",
    );
  });
});
