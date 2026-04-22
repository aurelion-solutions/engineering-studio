/**
 * Renderer for events list panels.
 * Pure buildRows/title/columns — no vscode dep.
 */

import type { PlatformEventEntry } from "../../api/types";
import type { PanelOpenArgs, PanelRow } from "../types";
import { classifyEvent } from "../../integrations/events/eventsDomains";
import type { EventDomain } from "../../integrations/events/eventsDomains";

export function eventsTitle(ctx: PanelOpenArgs): string {
  if (ctx.kind !== "events") {
    return "Events";
  }
  return `Events · ${ctx.domain}`;
}

export function eventsColumns(): string[] {
  return ["Time", "Type", "Correlation"];
}

export function buildEventsRows(
  domain: EventDomain,
  events: PlatformEventEntry[],
): PanelRow[] {
  return events
    .filter((e) => classifyEvent(e.event_type) === domain)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .map((e) => {
      const shortCorr = e.correlation_id.length > 8
        ? e.correlation_id.slice(0, 8) + "…"
        : e.correlation_id;
      return {
        id: e.event_id,
        cells: [
          { kind: "ts" as const, value: e.occurred_at },
          { kind: "badge" as const, value: "EVT" },
          { kind: "text" as const, value: e.event_type },
          { kind: "text" as const, value: shortCorr },
        ],
      };
    });
}

export const eventsListRenderer = {
  kind: "events" as const,
  title: eventsTitle,
  columns: () => eventsColumns(),
  buildRows: (data: { domain: EventDomain; events: PlatformEventEntry[] }) =>
    buildEventsRows(data.domain, data.events),
  refreshSeconds: 5 as number | null,
};
