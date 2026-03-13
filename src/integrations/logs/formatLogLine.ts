/**
 * Pure log-line formatter — no vscode dependency.
 *
 * Output format (Amendment C, D8):
 *
 *   [LEVEL] HH:MM:SS.sss <event_type> — <title>
 *           correlation_id=<uuid>  participants: <chain>
 *
 * Returns string[] of length 3: [line1, line2, ""].
 * The trailing empty string is the visual event separator.
 * Callers should push all three into the ring buffer so render() produces blank lines between events.
 *
 * Timestamp is UTC (D1).
 */

import type { LogBufferEvent } from "../../api/types";
import { levelPrefixFor } from "./levelMap";
import {
  connectorCommandDisplayTitle,
  formatParticipantChain,
} from "./formatLogCard";

const INVALID_TIMESTAMP = "--:--:--.---";

/** Replace control characters [\r\n\t] with a single space to keep log lines single-line. */
function oneLine(s: string): string {
  return s.replace(/[\r\n\t]/g, " ");
}

function formatUtcTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return INVALID_TIMESTAMP;
  }
  const HH = String(d.getUTCHours()).padStart(2, "0");
  const MM = String(d.getUTCMinutes()).padStart(2, "0");
  const SS = String(d.getUTCSeconds()).padStart(2, "0");
  const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
  return `${HH}:${MM}:${SS}.${ms}`;
}

/**
 * Constructs a complete LogBufferEvent from a minimal partial, filling safe defaults.
 * Use this instead of `as LogBufferEvent` casts for synthetic / recovery events.
 *
 * Defaults:
 *   - id / event_id  → "synthetic:<event_type>:<timestamp>"
 *   - correlation_id → "" (renders as correlation_id=—)
 *   - causation_id   → null
 *   - payload        → {}
 *   - component      → "engineering-studio"
 *   - initiator/target/actor → system:engineering-studio
 *   - created_at     → same as timestamp
 */
export function buildSyntheticLogEvent(partial: {
  level: string;
  timestamp: string;
  event_type: string;
  message: string;
}): LogBufferEvent {
  const syntheticId = `synthetic:${partial.event_type}:${partial.timestamp}`;
  return {
    id: syntheticId,
    event_id: syntheticId,
    event_type: partial.event_type,
    timestamp: partial.timestamp,
    level: partial.level,
    message: partial.message,
    component: "engineering-studio",
    correlation_id: "",
    causation_id: null,
    payload: {},
    initiator_type: "system",
    initiator_id: "engineering-studio",
    actor_type: "system",
    actor_id: "engineering-studio",
    target_type: "system",
    target_id: "engineering-studio",
    created_at: partial.timestamp,
  };
}

/**
 * Formats a LogBufferEvent into a rich multi-line log entry.
 *
 * Returns string[] of length 3: [line1, line2, ""].
 *
 * line1: [LEVEL] HH:MM:SS.sss <event_type> — <title>
 *        If event_type is absent/empty: [LEVEL] HH:MM:SS.sss <title>
 *
 * line2: (8 spaces)<correlation_id=...>  participants: <chain>
 *        correlation_id is "—" when null/undefined/empty.
 *        participants chain is "—" when empty.
 *
 * line3: "" (visual separator between events in the ring buffer)
 */
export function formatLogLine(ev: LogBufferEvent): string[] {
  const prefix = levelPrefixFor(ev.level);
  const ts = formatUtcTimestamp(ev.timestamp);

  // title: connector.command.* → display title; otherwise message
  const rawTitle =
    connectorCommandDisplayTitle(ev.event_type ?? "", ev.payload ?? {}) ??
    ev.message;
  const title = oneLine(rawTitle);

  // line 1
  const eventType = (ev.event_type ?? "").trim();
  const line1 =
    eventType.length > 0
      ? `[${prefix}] ${ts} ${eventType} \u2014 ${title}`
      : `[${prefix}] ${ts} ${title}`;

  // correlation_id
  const corrRaw = (ev.correlation_id ?? "").trim();
  const corrOrDash = corrRaw.length > 0 ? corrRaw : "\u2014";

  // participant chain
  const chainRaw = oneLine(formatParticipantChain(ev));
  const chainOrDash = chainRaw.trim().length > 0 ? chainRaw : "\u2014";

  // line 2 — exactly 8 spaces indent, two spaces between kv pairs
  const line2 = `        correlation_id=${corrOrDash}  participants: ${chainOrDash}`;

  return [line1, line2, ""];
}
