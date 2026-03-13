/**
 * Pure helpers ported verbatim from aurelion-gui/src/widgets/application-logs/lib/formatLogCard.ts.
 * No React dependency, no vscode dependency — plain TypeScript.
 *
 * Keep in sync with the GUI source mechanically: diff the two files when the GUI version changes.
 */

import type { LogBufferEvent } from "../../api/types";

const CONNECTOR_COMMAND_PREFIX = "connector.command.";

function stringField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

/** Best-effort subtype for connector command cards (existing payload keys only). */
export function payloadCommandSubtype(
  payload: Record<string, unknown>,
): string | null {
  return (
    stringField(payload.operation) ??
    stringField(payload.list_key) ??
    stringField(payload.dataset_type) ??
    null
  );
}

export function humanizeToken(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

const COMMAND_VERB: Record<string, string> = {
  received: "Command received",
  completed: "Command completed",
  failed: "Command failed",
  enqueued: "Command enqueued",
  published: "Command published",
  sent: "Command sent",
};

/**
 * Readable primary title for connector.command.* rows; null for other event types.
 */
export function connectorCommandDisplayTitle(
  eventType: string,
  payload: Record<string, unknown>,
): string | null {
  if (!eventType.startsWith(CONNECTOR_COMMAND_PREFIX)) return null;
  const verbKey = eventType.slice(CONNECTOR_COMMAND_PREFIX.length);
  const verb = COMMAND_VERB[verbKey] ?? `Command · ${humanizeToken(verbKey)}`;
  const sub = payloadCommandSubtype(payload);
  if (sub) return `${verb} · ${humanizeToken(sub)}`;
  return verb;
}

/** Participant chain: initiator → target → actor (display only). */
export function formatParticipantChain(ev: LogBufferEvent): string {
  const i = `${ev.initiator_type}:${ev.initiator_id}`;
  const t = `${ev.target_type}:${ev.target_id}`;
  const a = `${ev.actor_type}:${ev.actor_id}`;
  return `${i} → ${t} → ${a}`;
}
