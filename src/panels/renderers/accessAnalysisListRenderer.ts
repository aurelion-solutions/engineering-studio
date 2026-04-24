/**
 * Renderer for access analysis list panels.
 * Pure buildRows/title/columns — no vscode dep.
 */

import type { PanelOpenArgs, PanelRow } from "../types";
import { ACCESS_ANALYSIS_CATEGORIES } from "../../integrations/accessAnalysis/accessAnalysisCategories";

export function accessAnalysisTitle(ctx: PanelOpenArgs): string {
  if (ctx.kind !== "accessAnalysis") {
    return "Access Analysis";
  }
  return ctx.label;
}

export function accessAnalysisColumns(): string[] {
  return ["ID", "Name", "Description", "Updated"];
}

export function buildAccessAnalysisRows(
  categoryKey: string,
  data: unknown[],
): PanelRow[] {
  const catDef = ACCESS_ANALYSIS_CATEGORIES.find((c) => c.key === categoryKey);

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
      name = String(r["slug"] ?? r["code"] ?? r["name"] ?? "");
      desc = String(r["status"] ?? r["kind"] ?? "");
      ts = String(r["updated_at"] ?? r["created_at"] ?? "");
    }

    return {
      id: id || String(idx),
      meta: { clickable: "1" },
      cells: [
        { kind: "text" as const, value: id.length > 8 ? id.slice(0, 8) + "…" : id },
        { kind: "text" as const, value: name },
        { kind: "text" as const, value: desc },
        { kind: "ts" as const, value: ts },
      ],
    };
  });
}

export const accessAnalysisListRenderer = {
  kind: "accessAnalysis" as const,
  title: accessAnalysisTitle,
  columns: accessAnalysisColumns,
  buildRows: (data: { categoryKey: string; items: unknown[] }) =>
    buildAccessAnalysisRows(data.categoryKey, data.items),
  refreshSeconds: null as null,
};
