import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatLogLine, buildSyntheticLogEvent } from "../formatLogLine";
import type { LogBufferEvent } from "../../../api/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<LogBufferEvent>): LogBufferEvent {
  return {
    id: "test-id",
    event_id: "evt-1",
    event_type: "test.event",
    timestamp: "2026-04-15T12:34:56.789Z",
    level: "info",
    message: "test message",
    component: "test",
    correlation_id: "corr-uuid-1234",
    causation_id: null,
    payload: {},
    initiator_type: "user",
    initiator_id: "user-1",
    actor_type: "user",
    actor_id: "user-1",
    target_type: "application",
    target_id: "app-1",
    created_at: "2026-04-15T12:34:56.789Z",
    ...overrides,
  };
}

// ─── return shape ─────────────────────────────────────────────────────────────

describe("formatLogLine — return shape", () => {
  it("returns an array of length 3", () => {
    const result = formatLogLine(makeEvent({}));
    assert.strictEqual(result.length, 3, "must return exactly 3 elements");
  });

  it("third element is an empty string (visual separator)", () => {
    const [, , sep] = formatLogLine(makeEvent({}));
    assert.strictEqual(sep, "", "separator must be empty string");
  });
});

// ─── line 1 — level prefix ────────────────────────────────────────────────────

describe("formatLogLine — level prefixes", () => {
  it("level 'info' → [INFO]", () => {
    const [line1] = formatLogLine(makeEvent({ level: "info" }));
    assert.ok(line1.startsWith("[INFO]"), `got: ${line1}`);
  });

  it("level 'WARN' → [WARN]", () => {
    const [line1] = formatLogLine(makeEvent({ level: "WARN" }));
    assert.ok(line1.startsWith("[WARN]"), `got: ${line1}`);
  });

  it("level 'warn' → [WARN]", () => {
    const [line1] = formatLogLine(makeEvent({ level: "warn" }));
    assert.ok(line1.startsWith("[WARN]"), `got: ${line1}`);
  });

  it("level 'warning' → [WARN]", () => {
    const [line1] = formatLogLine(makeEvent({ level: "warning" }));
    assert.ok(line1.startsWith("[WARN]"), `got: ${line1}`);
  });

  it("level 'fatal' → [ERROR]", () => {
    const [line1] = formatLogLine(makeEvent({ level: "fatal" }));
    assert.ok(line1.startsWith("[ERROR]"), `got: ${line1}`);
  });

  it("level 'critical' → [ERROR]", () => {
    const [line1] = formatLogLine(makeEvent({ level: "critical" }));
    assert.ok(line1.startsWith("[ERROR]"), `got: ${line1}`);
  });

  it("level 'debug' → [DEBUG]", () => {
    const [line1] = formatLogLine(makeEvent({ level: "debug" }));
    assert.ok(line1.startsWith("[DEBUG]"), `got: ${line1}`);
  });

  it("level 'trace' → [TRACE]", () => {
    const [line1] = formatLogLine(makeEvent({ level: "trace" }));
    assert.ok(line1.startsWith("[TRACE]"), `got: ${line1}`);
  });
});

// ─── line 1 — timestamp ───────────────────────────────────────────────────────

describe("formatLogLine — timestamp", () => {
  it("valid ISO timestamp → UTC HH:MM:SS.sss in line1", () => {
    const [line1] = formatLogLine(
      makeEvent({ timestamp: "2026-04-15T12:34:56.789Z" }),
    );
    assert.ok(line1.includes("12:34:56.789"), `got: ${line1}`);
  });

  it("invalid timestamp → fallback --:--:--.---", () => {
    const [line1] = formatLogLine(makeEvent({ timestamp: "not-a-date" }));
    assert.ok(line1.includes("--:--:--.---"), `got: ${line1}`);
  });

  it("UTC boundary 00:00:00.000", () => {
    const [line1] = formatLogLine(
      makeEvent({ timestamp: "2026-01-01T00:00:00.000Z" }),
    );
    assert.ok(line1.includes("00:00:00.000"), `got: ${line1}`);
  });

  it("UTC boundary 23:59:59.999", () => {
    const [line1] = formatLogLine(
      makeEvent({ timestamp: "2026-12-31T23:59:59.999Z" }),
    );
    assert.ok(line1.includes("23:59:59.999"), `got: ${line1}`);
  });
});

// ─── line 1 — event_type and title ───────────────────────────────────────────

describe("formatLogLine — event_type segment", () => {
  it("non-connector event → event_type — message", () => {
    const [line1] = formatLogLine(
      makeEvent({ event_type: "user.created", message: "User was created" }),
    );
    // em-dash U+2014
    assert.ok(
      line1.includes("user.created \u2014 User was created"),
      `got: ${line1}`,
    );
  });

  it("event_type absent (empty string) → no event_type segment", () => {
    const [line1] = formatLogLine(
      makeEvent({ event_type: "", message: "bare message" }),
    );
    assert.ok(!line1.includes("\u2014"), `should have no em-dash, got: ${line1}`);
    assert.ok(line1.includes("bare message"), `got: ${line1}`);
  });

  it("connector.command.received → display title on line1", () => {
    const [line1] = formatLogLine(
      makeEvent({
        event_type: "connector.command.received",
        payload: {},
        message: "fallback",
      }),
    );
    assert.ok(
      line1.includes("Command received"),
      `expected 'Command received', got: ${line1}`,
    );
  });

  it("connector.command.completed + operation payload → subtype in title", () => {
    const [line1] = formatLogLine(
      makeEvent({
        event_type: "connector.command.completed",
        payload: { operation: "sync_accounts" },
        message: "fallback",
      }),
    );
    assert.ok(
      line1.includes("Command completed \u00b7 sync accounts") ||
        line1.includes("Command completed · sync accounts"),
      `expected subtype in title, got: ${line1}`,
    );
  });

  it("non-connector event → message used as title (not display title)", () => {
    const [line1] = formatLogLine(
      makeEvent({ event_type: "log.stream.recovered", message: "Recovered OK" }),
    );
    assert.ok(line1.includes("Recovered OK"), `got: ${line1}`);
  });

  it("control chars in message are sanitized on line1", () => {
    const [line1] = formatLogLine(
      makeEvent({ message: "line\nwith\nnewlines", event_type: "" }),
    );
    assert.ok(!line1.includes("\n"), "line1 must not contain newlines");
    assert.ok(line1.includes("line with newlines"), `got: ${line1}`);
  });
});

// ─── line 2 — correlation_id ─────────────────────────────────────────────────

describe("formatLogLine — correlation_id on line2", () => {
  it("present correlation_id → shown verbatim", () => {
    const [, line2] = formatLogLine(
      makeEvent({ correlation_id: "abc-def-123" }),
    );
    assert.ok(
      line2.includes("correlation_id=abc-def-123"),
      `got: ${line2}`,
    );
  });

  it("empty correlation_id → correlation_id=—", () => {
    const [, line2] = formatLogLine(makeEvent({ correlation_id: "" }));
    assert.ok(
      line2.includes("correlation_id=\u2014"),
      `got: ${line2}`,
    );
  });

  it("whitespace-only correlation_id → correlation_id=—", () => {
    const [, line2] = formatLogLine(makeEvent({ correlation_id: "   " }));
    assert.ok(
      line2.includes("correlation_id=\u2014"),
      `got: ${line2}`,
    );
  });
});

// ─── line 2 — participants ────────────────────────────────────────────────────

describe("formatLogLine — participant chain on line2", () => {
  it("single participant set → chain formatted", () => {
    const [, line2] = formatLogLine(
      makeEvent({
        initiator_type: "user",
        initiator_id: "u-1",
        target_type: "application",
        target_id: "app-2",
        actor_type: "connector",
        actor_id: "conn-3",
      }),
    );
    assert.ok(
      line2.includes("participants: user:u-1 → application:app-2 → connector:conn-3"),
      `got: ${line2}`,
    );
  });

  it("control chars in participant chain are sanitized", () => {
    const [, line2] = formatLogLine(
      makeEvent({
        initiator_type: "user",
        initiator_id: "u\n1",
        target_type: "app",
        target_id: "a\t2",
        actor_type: "sys",
        actor_id: "s\r3",
      }),
    );
    assert.ok(!line2.includes("\n"), "line2 must not contain newlines");
    assert.ok(!line2.includes("\t"), "line2 must not contain tabs");
    assert.ok(!line2.includes("\r"), "line2 must not contain carriage returns");
  });
});

// ─── line 2 — format contract ────────────────────────────────────────────────

describe("formatLogLine — line2 format contract", () => {
  it("line2 starts with exactly 8 spaces", () => {
    const [, line2] = formatLogLine(makeEvent({}));
    assert.ok(
      line2.startsWith("        "),
      `expected 8-space indent, got: '${line2.slice(0, 12)}'`,
    );
    assert.ok(
      !line2.startsWith("         "),
      "must be exactly 8 spaces, not 9+",
    );
  });

  it("two spaces between correlation_id pair and participants pair", () => {
    const [, line2] = formatLogLine(
      makeEvent({ correlation_id: "cid-1" }),
    );
    assert.ok(
      line2.includes("correlation_id=cid-1  participants:"),
      `expected two spaces between pairs, got: ${line2}`,
    );
  });

  it("full format snapshot", () => {
    const [line1, line2, sep] = formatLogLine(
      makeEvent({
        level: "error",
        timestamp: "2026-01-01T00:00:00.000Z",
        event_type: "app.error",
        message: "boom",
        correlation_id: "corr-42",
        initiator_type: "user",
        initiator_id: "u-1",
        target_type: "application",
        target_id: "app-1",
        actor_type: "user",
        actor_id: "u-1",
      }),
    );
    assert.strictEqual(
      line1,
      "[ERROR] 00:00:00.000 app.error \u2014 boom",
    );
    assert.strictEqual(
      line2,
      "        correlation_id=corr-42  participants: user:u-1 → application:app-1 → user:u-1",
    );
    assert.strictEqual(sep, "");
  });
});

// ─── buildSyntheticLogEvent ───────────────────────────────────────────────────

describe("buildSyntheticLogEvent", () => {
  it("fills all required LogBufferEvent fields", () => {
    const ev = buildSyntheticLogEvent({
      level: "info",
      timestamp: "2026-04-15T10:00:00.000Z",
      event_type: "log.stream.recovered",
      message: "Log stream recovered",
    });
    assert.strictEqual(ev.level, "info");
    assert.strictEqual(ev.event_type, "log.stream.recovered");
    assert.strictEqual(ev.message, "Log stream recovered");
    assert.strictEqual(ev.component, "engineering-studio");
    assert.strictEqual(ev.correlation_id, "");
    assert.strictEqual(ev.causation_id, null);
    assert.deepStrictEqual(ev.payload, {});
  });

  it("synthetic id contains event_type and timestamp", () => {
    const ts = "2026-04-15T10:00:00.000Z";
    const ev = buildSyntheticLogEvent({
      level: "info",
      timestamp: ts,
      event_type: "log.stream.recovered",
      message: "x",
    });
    assert.ok(
      ev.id.includes("log.stream.recovered"),
      `id should contain event_type: ${ev.id}`,
    );
    assert.ok(ev.id.includes(ts), `id should contain timestamp: ${ev.id}`);
  });

  it("renders without errors through formatLogLine", () => {
    const ev = buildSyntheticLogEvent({
      level: "info",
      timestamp: "2026-04-15T10:00:00.000Z",
      event_type: "log.stream.recovered",
      message: "Log stream recovered",
    });
    const lines = formatLogLine(ev);
    assert.strictEqual(lines.length, 3);
    // empty correlation_id → em-dash
    assert.ok(lines[1].includes("correlation_id=\u2014"), `got: ${lines[1]}`);
  });
});
