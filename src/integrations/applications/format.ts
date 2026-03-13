import type { LogBufferEvent } from "../../api/types";

const CONNECTOR_COMMAND_PREFIX = "connector.command.";

function stringField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

function payloadCommandSubtype(
  payload: Record<string, unknown>,
): string | null {
  return (
    stringField(payload.operation) ??
    stringField(payload.list_key) ??
    stringField(payload.dataset_type) ??
    null
  );
}

function humanizeToken(raw: string): string {
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

export function connectorCommandDisplayTitle(
  eventType: string,
  payload: Record<string, unknown>,
): string | null {
  if (!eventType.startsWith(CONNECTOR_COMMAND_PREFIX)) return null;
  const verbKey = eventType.slice(CONNECTOR_COMMAND_PREFIX.length);
  const verb =
    COMMAND_VERB[verbKey] ?? `Command · ${humanizeToken(verbKey)}`;
  const sub = payloadCommandSubtype(payload);
  if (sub) return `${verb} · ${humanizeToken(sub)}`;
  return verb;
}

export function formatIntegrationWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

export function logEventPrimaryLine(ev: LogBufferEvent): string {
  return (
    connectorCommandDisplayTitle(ev.event_type, ev.payload) ?? ev.message
  );
}
