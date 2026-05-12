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

export function inventoryColumns(categoryKey?: string): string[] {
  if (categoryKey === "persons") {
    return ["ID", "External ID", "Full Name"];
  }
  if (categoryKey === "employees") {
    return ["ID", "Person", "Locked"];
  }
  return ["ID", "Name", "Description", "Updated"];
}

export function buildInventoryRows(
  categoryKey: string,
  data: unknown[],
): PanelRow[] {
  const catDef = INVENTORY_CATEGORIES.find((c) => c.key === categoryKey);
  const isPersons = categoryKey === "persons";
  const isEmployees = categoryKey === "employees";

  return data.map((row, idx) => {
    let id = "";
    let name = "";
    let desc = "";
    let ts = "";

    if (catDef && catDef.columns !== undefined) {
      try { id = catDef.columns.id(row); } catch { id = ""; }
      try { name = catDef.columns.name(row); } catch { name = ""; }
      try { desc = catDef.columns.desc(row); } catch { desc = ""; }
      try { ts = catDef.columns.ts(row); } catch { ts = ""; }
    } else {
      const r = row as Record<string, unknown>;
      id = String(r["id"] ?? idx);
      name = String(r["external_id"] ?? r["name"] ?? "");
      desc = String(r["status"] ?? r["kind"] ?? "");
      ts = String(r["updated_at"] ?? r["created_at"] ?? "");
    }

    const shortId = id.length > 8 ? id.slice(0, 8) + "…" : id;

    if (isPersons) {
      return {
        id: id || String(idx),
        meta: { clickable: "1" },
        cells: [
          { kind: "text" as const, value: shortId },
          { kind: "text" as const, value: name },
          { kind: "text" as const, value: desc },
        ],
      };
    }

    if (isEmployees) {
      return {
        id: id || String(idx),
        meta: { clickable: "1" },
        cells: [
          { kind: "text" as const, value: shortId },
          { kind: "text" as const, value: name },
          { kind: desc ? "badge" as const : "text" as const, value: desc },
        ],
      };
    }

    return {
      id: id || String(idx),
      meta: { clickable: "1" },
      cells: [
        { kind: "text" as const, value: shortId },
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
