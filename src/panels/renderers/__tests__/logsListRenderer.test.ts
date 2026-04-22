import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLogsRows, logsColumns, logsTitle } from "../logsListRenderer";
import type { PlatformLogEntry } from "../../../api/types";

function makeLog(id: string, level: string, ts: string): PlatformLogEntry {
  return {
    id,
    event_id: `evt-${id}`,
    event_type: null,
    timestamp: ts,
    level,
    message: "test message",
    component: "test-component",
    correlation_id: "corr-001",
    causation_id: null,
    payload: {},
  };
}

describe("buildLogsRows", () => {
  const logs: PlatformLogEntry[] = [
    makeLog("log-1", "info", "2024-06-01T10:00:00Z"),
    makeLog("log-2", "error", "2024-06-01T12:00:00Z"),
    makeLog("log-3", "warning", "2024-06-01T11:00:00Z"),
  ];

  it("returns rows sorted newest-first", () => {
    const rows = buildLogsRows(logs);
    assert.equal(rows.length, 3);
    assert.ok(
      rows[0].cells[0].value >= rows[1].cells[0].value,
      "Rows should be newest-first",
    );
  });

  it("each row has 4 cells", () => {
    const rows = buildLogsRows(logs);
    assert.ok(rows.every((r) => r.cells.length === 4), "Each row should have 4 cells");
  });

  it("trims to max 50 rows", () => {
    const many: PlatformLogEntry[] = Array.from({ length: 60 }, (_, i) =>
      makeLog(`log-${i}`, "info", `2024-06-01T${String(i).padStart(2, "0")}:00:00Z`),
    );
    const rows = buildLogsRows(many);
    assert.ok(rows.length <= 50, "Should return at most 50 rows");
  });
});

describe("logsColumns", () => {
  it("returns 4 column headers", () => {
    assert.equal(logsColumns().length, 4);
  });
});

describe("logsTitle", () => {
  it("includes minLevel in title", () => {
    const title = logsTitle({ kind: "logs", ctxKey: "error", minLevel: "error" });
    assert.ok(title.includes("error"));
  });
});
