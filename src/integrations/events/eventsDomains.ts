/**
 * Pure domain classifier for platform events.
 * No `vscode` import — unit-testable via `node --test`.
 */

export type EventDomain = "inventory" | "capabilities" | "platform";

const CAPABILITY_NAMESPACES = [
  "reconciliation",
  "provisioning",
  "ingest",
  "effective_grants",
  "eas",
];

/**
 * Classifies an event_type string into its domain bucket.
 * Classification is based on the first dot-separated segment (namespace root).
 */
export function classifyEvent(eventType: string): EventDomain {
  const root = eventType.split(".")[0] ?? "";
  if (root === "inventory") {
    return "inventory";
  }
  if (CAPABILITY_NAMESPACES.includes(root)) {
    return "capabilities";
  }
  return "platform";
}
