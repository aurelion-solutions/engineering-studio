/**
 * Renderer for the Account State panel (multi-tab: List / Incoming / Outgoing).
 * Pure, no `vscode` dep — testable via `node --test`.
 */

import type { PanelRow } from "../types";
import type { AccountStateTabKey } from "../types";
import { INVENTORY_CATEGORIES } from "../../integrations/inventory/inventoryCategories";
import type { AccountStateTab, RichCell } from "../../integrations/inventory/inventoryCategories";

// ─── Column headers per tab ───────────────────────────────────────────────────

export function accountStateColumns(tab: AccountStateTabKey): string[] {
  const catDef = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
  const tabDef = catDef?.tabs?.find((t) => t.key === tab);
  if (tabDef?.richHeaders) {
    return tabDef.richHeaders;
  }
  // Fallback (should not be reached with current data)
  switch (tab) {
    case "list":
      return ["Application", "Username", "Status", "MFA", "Privileged", "Subject", "Updated"];
    case "incoming":
      return ["Application", "Op", "Account/Target", "Change", "Time"];
    case "outgoing":
      return ["Application", "Kind", "Status", "Subject", "Target", "Change", "Time"];
  }
}

// ─── Row builder per tab ──────────────────────────────────────────────────────

export function buildAccountStateRows(tab: AccountStateTabKey, data: unknown[]): PanelRow[] {
  const catDef = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
  if (!catDef || !catDef.tabs) {
    return [];
  }
  const tabDef: AccountStateTab | undefined = catDef.tabs.find((t) => t.key === tab);
  if (!tabDef) {
    return [];
  }

  return data.map((row, idx) => {
    let id = "";
    try { id = tabDef.columns.id(row); } catch { id = ""; }

    let richCells: RichCell[] = [];
    try {
      richCells = tabDef.buildRichRow(row);
    } catch {
      richCells = [];
    }

    return {
      id: id || String(idx),
      cells: richCells.map((rc) => ({
        kind: "text" as const,
        value: rc.text,
        extra: rc.cssClass || rc.tooltip
          ? JSON.stringify({ cssClass: rc.cssClass, tooltip: rc.tooltip })
          : undefined,
      })),
    };
  });
}

/**
 * Build rich rows — returns structured RichCell arrays for direct use by
 * callers that want full CSS class / tooltip metadata without going through
 * PanelCell serialisation.
 */
export function buildAccountStateRichRows(tab: AccountStateTabKey, data: unknown[]): Array<{ id: string; cells: RichCell[] }> {
  const catDef = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
  if (!catDef || !catDef.tabs) { return []; }
  const tabDef: AccountStateTab | undefined = catDef.tabs.find((t) => t.key === tab);
  if (!tabDef) { return []; }

  return data.map((row, idx) => {
    let id = "";
    try { id = tabDef.columns.id(row); } catch { id = ""; }
    let cells: RichCell[] = [];
    try { cells = tabDef.buildRichRow(row); } catch { cells = []; }
    return { id: id || String(idx), cells };
  });
}

// ─── Tab definitions for UI rendering ────────────────────────────────────────

export const ACCOUNT_STATE_TABS: Array<{ key: AccountStateTabKey; label: string }> = [
  { key: "list", label: "List" },
  { key: "incoming", label: "Incoming" },
  { key: "outgoing", label: "Outgoing" },
];
