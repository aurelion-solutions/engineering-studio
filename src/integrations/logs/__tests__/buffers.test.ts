import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LogBuffer, BUFFER_CAP_LINES } from "../buffers";

describe("LogBuffer", () => {
  it("empty buffer renders empty string", () => {
    const buf = new LogBuffer();
    assert.strictEqual(buf.render(), "");
  });

  it("append batch < cap → render concatenates all lines with \\n", () => {
    const buf = new LogBuffer();
    buf.append(["line A", "line B", "line C"]);
    assert.strictEqual(buf.render(), "line A\nline B\nline C");
  });

  it("multiple append calls accumulate lines", () => {
    const buf = new LogBuffer();
    buf.append(["line 1", "line 2", ""]);
    buf.append(["line 3", "line 4", ""]);
    const rendered = buf.render();
    assert.ok(rendered.includes("line 1"), "should contain line 1");
    assert.ok(rendered.includes("line 4"), "should contain line 4");
    const lines = rendered.split("\n");
    assert.strictEqual(lines.length, 6);
  });

  it("exactly cap lines via single-element batches → no eviction", () => {
    const buf = new LogBuffer();
    for (let i = 0; i < BUFFER_CAP_LINES; i++) {
      buf.append([`line ${i}`]);
    }
    const rendered = buf.render();
    const lines = rendered.split("\n");
    assert.strictEqual(lines.length, BUFFER_CAP_LINES);
    assert.strictEqual(lines[0], "line 0");
    assert.strictEqual(lines[BUFFER_CAP_LINES - 1], `line ${BUFFER_CAP_LINES - 1}`);
  });

  it("append > cap via single-element batches → oldest line evicted (FIFO)", () => {
    const buf = new LogBuffer();
    // Fill to cap
    for (let i = 0; i < BUFFER_CAP_LINES; i++) {
      buf.append([`line ${i}`]);
    }
    // Add one more — line 0 should be evicted
    buf.append(["line overflow"]);
    const rendered = buf.render();
    const lines = rendered.split("\n");
    assert.strictEqual(lines.length, BUFFER_CAP_LINES);
    assert.strictEqual(lines[0], "line 1", "oldest line should be evicted");
    assert.strictEqual(lines[BUFFER_CAP_LINES - 1], "line overflow");
  });

  it("appending 3-line event near cap → oldest 3 lines evicted (FIFO)", () => {
    const buf = new LogBuffer();
    // Fill to cap - 1 so one slot remains
    for (let i = 0; i < BUFFER_CAP_LINES - 1; i++) {
      buf.append([`seed ${i}`]);
    }
    // Append a 3-line event: needs 3 slots but only 1 is free → 2 evictions happen
    buf.append(["event-line1", "event-line2", ""]);
    const rendered = buf.render();
    const lines = rendered.split("\n");
    assert.strictEqual(
      lines.length,
      BUFFER_CAP_LINES,
      "buffer must stay at cap after eviction",
    );
    // seed 0 and seed 1 should be gone (evicted to make room for 3 new lines)
    assert.ok(!lines.includes("seed 0"), "seed 0 should be evicted");
    assert.ok(!lines.includes("seed 1"), "seed 1 should be evicted");
    // event lines should be at the end
    assert.strictEqual(lines[BUFFER_CAP_LINES - 3], "event-line1");
    assert.strictEqual(lines[BUFFER_CAP_LINES - 2], "event-line2");
    assert.strictEqual(lines[BUFFER_CAP_LINES - 1], "");
  });

  it("appending empty batch → no change", () => {
    const buf = new LogBuffer();
    buf.append(["existing"]);
    buf.append([]);
    assert.strictEqual(buf.render(), "existing");
  });
});
