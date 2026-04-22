/**
 * Pure domain definitions for the Events tree.
 * No `vscode` import — unit-testable via `node --test`.
 */

import type { EventDomain } from "./eventsDomains";

export type EventDomainDef = {
  key: EventDomain;
  label: string;
  iconId: string;
};

export function buildEventsDomainDefs(): EventDomainDef[] {
  return [
    { key: "inventory", label: "Inventory", iconId: "person" },
    { key: "capabilities", label: "Capabilities", iconId: "circuit-board" },
    { key: "platform", label: "Platform", iconId: "server" },
  ];
}
