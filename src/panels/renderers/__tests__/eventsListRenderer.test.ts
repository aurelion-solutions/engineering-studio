import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildEventsRows, eventsColumns, eventsTitle } from "../eventsListRenderer";
import type { PlatformEventEntry } from "../../../api/types";

function makeEvent(eventType: string, ts: string): PlatformEventEntry {
  return {
    event_id: `evt-${eventType}-${ts}`,
    event_type: eventType,
    occurred_at: ts,
    correlation_id: "corr-0000000000",
    causation_id: null,
    payload: {},
    initiator_kind: null,
    initiator_id: null,
    actor_kind: null,
    actor_id: null,
    target_kind: null,
    target_id: null,
    schema_version: "1",
  };
}

describe("buildEventsRows", () => {
  const events: PlatformEventEntry[] = [
    makeEvent("inventory.customer.created", "2024-06-01T10:00:00Z"),
    makeEvent("reconciliation.run.started", "2024-06-01T11:00:00Z"),
    makeEvent("audit.user.login", "2024-06-01T09:00:00Z"),
    makeEvent("inventory.account.updated", "2024-06-01T08:00:00Z"),
    makeEvent("provisioning.task.done", "2024-06-01T07:00:00Z"),
  ];

  it("filters to only inventory domain events", () => {
    const rows = buildEventsRows("inventory", events);
    assert.equal(rows.length, 2, "Should have 2 inventory events");
    assert.ok(
      rows.every((r) => {
        const typeCell = r.cells.find((c) => c.value.startsWith("inventory."));
        return typeCell !== undefined;
      }),
      "All rows should be inventory events",
    );
  });

  it("filters to only capabilities domain events", () => {
    const rows = buildEventsRows("capabilities", events);
    assert.equal(rows.length, 2, "Should have 2 capability events");
  });

  it("rows are sorted newest-first", () => {
    const rows = buildEventsRows("inventory", events);
    assert.ok(
      rows[0].cells[0].value >= rows[1].cells[0].value,
      "Rows should be newest-first",
    );
  });
});

describe("eventsColumns", () => {
  it("returns column headers", () => {
    assert.ok(eventsColumns().length > 0);
  });
});

describe("eventsTitle", () => {
  it("includes domain in title", () => {
    const title = eventsTitle({ kind: "events", ctxKey: "inventory", domain: "inventory" });
    assert.ok(title.includes("inventory"));
  });
});
