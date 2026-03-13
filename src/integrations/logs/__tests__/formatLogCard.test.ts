import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  connectorCommandDisplayTitle,
  formatParticipantChain,
  humanizeToken,
  payloadCommandSubtype,
} from "../formatLogCard";
import type { LogBufferEvent } from "../../../api/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<LogBufferEvent>): LogBufferEvent {
  return {
    id: "test-id",
    event_id: "evt-1",
    event_type: "test.event",
    timestamp: "2026-04-15T12:00:00.000Z",
    level: "info",
    message: "test",
    component: "test",
    correlation_id: "corr-1",
    causation_id: null,
    payload: {},
    initiator_type: "user",
    initiator_id: "user-1",
    actor_type: "user",
    actor_id: "user-1",
    target_type: "application",
    target_id: "app-1",
    created_at: "2026-04-15T12:00:00.000Z",
    ...overrides,
  };
}

// ─── humanizeToken ────────────────────────────────────────────────────────────

describe("humanizeToken", () => {
  it("replaces underscores with spaces", () => {
    assert.strictEqual(humanizeToken("foo_bar"), "foo bar");
  });

  it("collapses multiple spaces", () => {
    assert.strictEqual(humanizeToken("foo  bar"), "foo bar");
  });

  it("trims surrounding whitespace", () => {
    assert.strictEqual(humanizeToken("  foo "), "foo");
  });

  it("passthrough for already clean token", () => {
    assert.strictEqual(humanizeToken("command"), "command");
  });
});

// ─── payloadCommandSubtype ────────────────────────────────────────────────────

describe("payloadCommandSubtype", () => {
  it("returns operation when present", () => {
    assert.strictEqual(payloadCommandSubtype({ operation: "sync" }), "sync");
  });

  it("falls back to list_key when operation absent", () => {
    assert.strictEqual(
      payloadCommandSubtype({ list_key: "employees" }),
      "employees",
    );
  });

  it("falls back to dataset_type as last resort", () => {
    assert.strictEqual(
      payloadCommandSubtype({ dataset_type: "accounts" }),
      "accounts",
    );
  });

  it("returns null for empty payload", () => {
    assert.strictEqual(payloadCommandSubtype({}), null);
  });

  it("returns null when all fields are empty strings", () => {
    assert.strictEqual(
      payloadCommandSubtype({ operation: "", list_key: "  ", dataset_type: "" }),
      null,
    );
  });
});

// ─── connectorCommandDisplayTitle ────────────────────────────────────────────

describe("connectorCommandDisplayTitle", () => {
  it("returns null for non-connector event type", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("user.created", {}),
      null,
    );
  });

  it("returns null for empty event type", () => {
    assert.strictEqual(connectorCommandDisplayTitle("", {}), null);
  });

  it("connector.command.received → 'Command received'", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.received", {}),
      "Command received",
    );
  });

  it("connector.command.completed → 'Command completed'", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.completed", {}),
      "Command completed",
    );
  });

  it("connector.command.failed → 'Command failed'", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.failed", {}),
      "Command failed",
    );
  });

  it("connector.command.enqueued → 'Command enqueued'", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.enqueued", {}),
      "Command enqueued",
    );
  });

  it("connector.command.published → 'Command published'", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.published", {}),
      "Command published",
    );
  });

  it("connector.command.sent → 'Command sent'", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.sent", {}),
      "Command sent",
    );
  });

  it("unknown verb → 'Command · <humanized>'", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.dispatched", {}),
      "Command · dispatched",
    );
  });

  it("known verb + operation payload → verb + subtype", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.completed", {
        operation: "sync_users",
      }),
      "Command completed · sync users",
    );
  });

  it("known verb + list_key payload → verb + subtype", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.received", {
        list_key: "accounts",
      }),
      "Command received · accounts",
    );
  });

  it("known verb + dataset_type payload → verb + subtype", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.failed", {
        dataset_type: "groups",
      }),
      "Command failed · groups",
    );
  });

  it("unknown verb + payload subtype → 'Command · verb · subtype'", () => {
    assert.strictEqual(
      connectorCommandDisplayTitle("connector.command.dispatched", {
        operation: "full_sync",
      }),
      "Command · dispatched · full sync",
    );
  });
});

// ─── formatParticipantChain ───────────────────────────────────────────────────

describe("formatParticipantChain", () => {
  it("formats all three pairs with arrows", () => {
    const ev = makeEvent({
      initiator_type: "user",
      initiator_id: "u-1",
      target_type: "application",
      target_id: "app-42",
      actor_type: "connector",
      actor_id: "conn-7",
    });
    assert.strictEqual(
      formatParticipantChain(ev),
      "user:u-1 → application:app-42 → connector:conn-7",
    );
  });

  it("formats system:engineering-studio synthetic defaults", () => {
    const ev = makeEvent({
      initiator_type: "system",
      initiator_id: "engineering-studio",
      target_type: "system",
      target_id: "engineering-studio",
      actor_type: "system",
      actor_id: "engineering-studio",
    });
    assert.strictEqual(
      formatParticipantChain(ev),
      "system:engineering-studio → system:engineering-studio → system:engineering-studio",
    );
  });

  it("returns a non-empty string for any valid event", () => {
    const ev = makeEvent({});
    const chain = formatParticipantChain(ev);
    assert.ok(chain.length > 0, "chain must be non-empty");
    assert.ok(chain.includes("→"), "chain must contain arrows");
  });
});
