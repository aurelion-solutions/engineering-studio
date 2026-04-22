/**
 * Renderer for inventory list panels.
 * Pure buildRows/title/columns — no vscode dep.
 */

import type { PanelOpenArgs, PanelRow } from "../types";
import { INVENTORY_CATEGORIES } from "../../integrations/inventory/inventoryCategories";

export function inventoryTitle(ctx: PanelOpenArgs): string {
  if (ctx.kind !== "inventory") {
    return "Inventory";
  }
  return ctx.label;
}

export function inventoryColumns(): string[] {
  return ["ID", "Name", "Description", "Updated"];
}

export function buildInventoryRows(
  categoryKey: string,
  data: unknown[],
): PanelRow[] {
  const catDef = INVENTORY_CATEGORIES.find((c) => c.key === categoryKey);

  return data.map((row, idx) => {
    let id = "";
    let name = "";
    let desc = "";
    let ts = "";

    if (catDef) {
      try { id = catDef.columns.id(row); } catch { id = ""; }
      try { name = catDef.columns.name(row); } catch { name = ""; }
      try { desc = catDef.columns.desc(row); } catch { desc = ""; }
      try { ts = catDef.columns.ts(row); } catch { ts = ""; }
    } else {
      // Fallback: generic field extraction
      const r = row as Record<string, unknown>;
      id = String(r["id"] ?? idx);
      name = String(r["external_id"] ?? r["name"] ?? "");
      desc = String(r["status"] ?? r["kind"] ?? "");
      ts = String(r["updated_at"] ?? r["created_at"] ?? "");
    }

    return {
      id: id || String(idx),
      cells: [
        { kind: "text" as const, value: id.length > 8 ? id.slice(0, 8) + "…" : id },
        { kind: "text" as const, value: name },
        { kind: "text" as const, value: desc },
        { kind: "ts" as const, value: ts },
      ],
    };
  });
}

export const inventoryListRenderer = {
  kind: "inventory" as const,
  title: inventoryTitle,
  columns: inventoryColumns,
  buildRows: (data: { categoryKey: string; items: unknown[] }) =>
    buildInventoryRows(data.categoryKey, data.items),
  refreshSeconds: null as null,
};
