/**
 * Renderer for the item-detail drawer panel.
 * Shows all fields of a single API object as key-value rows.
 * Pure function — no vscode dep.
 */

import type { SodRuleConditionFromApi } from "../../api/types";
import type { PanelRow, Section } from "../types";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (value.length === 0) return "(empty)";
    return value
      .map((v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)))
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function buildItemDetailRows(obj: Record<string, unknown>): PanelRow[] {
  return Object.entries(obj).map(([key, value]) => ({
    id: `field-${key}`,
    cells: [
      { kind: "kv" as const, value: key },
      { kind: "text" as const, value: formatValue(value) },
    ],
  }));
}

export function itemDetailColumns(): string[] {
  return ["Field", "Value"];
}

export function buildSodConditionsSection(
  conditions: SodRuleConditionFromApi[],
  capabilities: { id: number; slug: string }[],
): Section {
  const capMap = new Map(capabilities.map((c) => [c.id, c.slug]));
  const columns = ["Condition", "min_count", "Capabilities"];

  if (conditions.length === 0) {
    return {
      title: "Conditions",
      columns,
      rows: [{ id: "no-conds", cells: [{ kind: "text", value: "No conditions defined" }, { kind: "text", value: "" }, { kind: "text", value: "" }] }],
    };
  }

  return {
    title: "Conditions",
    columns,
    rows: conditions.map((cond) => ({
      id: `cond-${cond.id}`,
      cells: [
        { kind: "kv" as const, value: cond.name },
        { kind: "badge" as const, value: String(cond.min_count) },
        {
          kind: "text" as const,
          value: cond.capability_ids
            .map((id) => capMap.get(id) ?? `#${id}`)
            .join(", ") || "—",
        },
      ],
    })),
  };
}
