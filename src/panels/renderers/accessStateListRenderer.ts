/**
 * Renderer for the Access State panel (multi-tab: List / Incoming / Outgoing).
 * Pure, no `vscode` dep — testable via `node --test`.
 */

import type { PanelRow } from "../types";
import type { AccessStateTabKey } from "../types";
import {
  INVENTORY_CATEGORIES,
} from "../../integrations/inventory/inventoryCategories";
import type { AccessStateTab, RichCell } from "../../integrations/inventory/inventoryCategories";

// ─── Column headers per tab ───────────────────────────────────────────────────

export function accessStateColumns(tab: AccessStateTabKey): string[] {
  const catDef = INVENTORY_CATEGORIES.find((c) => c.key === "accessState");
  const tabDef = catDef?.tabs?.find((t) => t.key === tab);
  if (tabDef?.richHeaders) {
    return tabDef.richHeaders;
  }
  // Legacy fallback (should not be reached with current data)
  switch (tab) {
    case "list":
      return ["Application", "Subject", "Account", "Resource", "Action", "Effect", "Active"];
    case "incoming":
      return ["Application", "Op", "Subject", "Target", "Change", "Time"];
    case "outgoing":
      return ["Application", "Kind", "Status", "Subject", "Target", "Change", "Time"];
  }
}

// ─── Rich cell → PanelCell conversion ────────────────────────────────────────

/**
 * Convert RichCell to a PanelCell-compatible object understood by the webview.
 * The webview renders `cell.value` as text and applies `cell.extra` as:
 *   - CSS class via `data-class`
 *   - tooltip via `title` attribute
 * We encode class+tooltip in `extra` as JSON for the webview to pick up.
 */
export function richCellToPanelCell(cell: RichCell): { kind: "text"; value: string; cssClass?: string; tooltip?: string } {
  return {
    kind: "text" as const,
    value: cell.text,
    cssClass: cell.cssClass,
    tooltip: cell.tooltip,
  };
}

// ─── Row builder per tab ──────────────────────────────────────────────────────

export function buildAccessStateRows(tab: AccessStateTabKey, data: unknown[]): PanelRow[] {
  const catDef = INVENTORY_CATEGORIES.find((c) => c.key === "accessState");
  if (!catDef || !catDef.tabs) {
    return [];
  }
  const tabDef: AccessStateTab | undefined = catDef.tabs.find((t) => t.key === tab);
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
export function buildAccessStateRichRows(tab: AccessStateTabKey, data: unknown[]): Array<{ id: string; cells: RichCell[] }> {
  const catDef = INVENTORY_CATEGORIES.find((c) => c.key === "accessState");
  if (!catDef || !catDef.tabs) { return []; }
  const tabDef: AccessStateTab | undefined = catDef.tabs.find((t) => t.key === tab);
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

export const ACCESS_STATE_TABS: Array<{ key: AccessStateTabKey; label: string }> = [
  { key: "list", label: "List" },
  { key: "incoming", label: "Incoming" },
  { key: "outgoing", label: "Outgoing" },
];
