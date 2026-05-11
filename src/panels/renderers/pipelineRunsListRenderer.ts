/**
 * Renderer for pipeline runs list panels.
 * Pure module — no `vscode` import, no wall-clock calls, deterministic output.
 */

import type { PipelineRunStatus, PipelineRunSummaryFromApi } from "../../api/types";
import type { PanelOpenArgs, PanelRow, PanelRowAction } from "../types";

export function pipelineRunsColumns(): string[] {
  return ["Pipeline", "Status", "Started", "Current Step", "Duration", "Created"];
}

/**
 * Formats a duration between two ISO 8601 timestamps.
 *
 * - Both null → ""  (pending, not started)
 * - started non-null, finished null → "…"  (deterministic placeholder for running rows)
 * - Both non-null → "Xs" or "Xm Ys"
 * - Negative or NaN → ""
 */
export function formatDuration(
  started: string | null,
  finished: string | null,
): string {
  if (started === null) {
    return "";
  }
  if (finished === null) {
    return "…"; // "…"
  }
  const ms = Date.parse(finished) - Date.parse(started);
  if (Number.isNaN(ms) || ms < 0) {
    return "";
  }
  const s = Math.floor(ms / 1000);
  if (s < 60) {
    return `${s}s`;
  }
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const CANCEL_STATUSES = new Set<PipelineRunStatus>(["pending", "running", "awaiting_event"]);
const RETRY_STATUSES = new Set<PipelineRunStatus>(["completed", "failed", "failed_timeout", "cancelled"]);

export function actionsForRunStatus(status: PipelineRunStatus): PanelRowAction[] {
  if (CANCEL_STATUSES.has(status)) {
    return [{ verb: "cancel", label: "Cancel" }];
  }
  if (RETRY_STATUSES.has(status)) {
    return [{ verb: "retry", label: "Retry" }];
  }
  // cancelling → no actions
  return [];
}

export function buildPipelineRunsRows(runs: PipelineRunSummaryFromApi[]): PanelRow[] {
  return runs.map((r) => ({
    id: r.id,
    cells: [
      { kind: "text" as const,   value: r.pipeline_name },
      { kind: "status" as const, value: r.status },
      { kind: "ts" as const,     value: r.started_at ?? "" },
      { kind: "text" as const,   value: r.current_step ?? "" },
      { kind: "text" as const,   value: formatDuration(r.started_at, r.finished_at) },
      { kind: "ts" as const,     value: r.created_at },
    ],
    meta: { clickable: "1" },
    actions: actionsForRunStatus(r.status),
  }));
}

export const pipelineRunsListRenderer = {
  kind: "pipelineRuns" as const,
  title: (ctx: PanelOpenArgs): string =>
    `Pipeline runs · ${ctx.kind === "pipelineRuns" ? ctx.label : ""}`,
  columns: () => pipelineRunsColumns(),
  buildRows: buildPipelineRunsRows,
  refreshSeconds: 5 as number | null,
};
