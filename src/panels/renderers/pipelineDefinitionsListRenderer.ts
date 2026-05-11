/**
 * Renderer for the pipeline definitions list panel.
 * Pure module — no `vscode` import, no wall-clock calls, deterministic output.
 */

import type { PipelineSummaryFromApi } from "../../api/types";
import type { PanelRow } from "../types";

export function pipelineDefinitionsColumns(): string[] {
  return ["Name", "Version", "Triggers", "Steps"];
}

/**
 * Build trigger summary string for a single definition.
 *
 * - 0 triggers → ""
 * - 1 trigger  → first non-null routing_key / cron / every; fallback to type
 * - 2+ triggers → comma-joined type list
 */
function triggerSummary(def: PipelineSummaryFromApi): string {
  const { triggers } = def;
  if (triggers.length === 0) {
    return "";
  }
  if (triggers.length === 1) {
    const t = triggers[0];
    if (typeof t.routing_key === "string" && t.routing_key.length > 0) {
      return t.routing_key;
    }
    if (typeof t.cron === "string" && t.cron.length > 0) {
      return t.cron;
    }
    if (typeof t.every === "string" && t.every.length > 0) {
      return t.every;
    }
    return t.type;
  }
  return triggers.map((t) => t.type).join(", ");
}

export function buildPipelineDefinitionsRows(
  defs: PipelineSummaryFromApi[],
): PanelRow[] {
  return defs.map((def) => ({
    id: def.name,
    cells: [
      { kind: "text" as const, value: def.name },
      { kind: "badge" as const, value: String(def.version) },
      { kind: "text" as const, value: triggerSummary(def) },
      { kind: "text" as const, value: String(def.step_count) },
    ],
    meta: { clickable: "1" },
  }));
}
