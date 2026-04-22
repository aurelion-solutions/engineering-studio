/**
 * Renderer for logs list panels.
 * Pure buildRows/title/columns — no vscode dep.
 */

import type { PlatformLogEntry } from "../../api/types";
import type { PanelOpenArgs, PanelRow } from "../types";

export function logsTitle(ctx: PanelOpenArgs): string {
  if (ctx.kind !== "logs") {
    return "Logs";
  }
  return `Logs · ${ctx.minLevel}+`;
}

export function logsColumns(): string[] {
  return ["Time", "Level", "Correlation ID", "Message"];
}

function formatTs(iso: string): string {
  const m = /(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(iso);
  return m ? `UTC ${m[1]} ${m[2]}` : iso;
}

export function buildLogsRows(logs: PlatformLogEntry[]): PanelRow[] {
  return [...logs]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50)
    .map((l) => ({
      id: l.id,
      meta: { ts: l.timestamp },
      cells: [
        { kind: "ts" as const, value: formatTs(l.timestamp) },
        { kind: "level" as const, value: l.level },
        { kind: "text" as const, value: l.correlation_id },
        { kind: "text" as const, value: `${l.component}: ${l.message}` },
      ],
    }));
}

export const logsListRenderer = {
  kind: "logs" as const,
  title: logsTitle,
  columns: () => logsColumns(),
  buildRows: (data: PlatformLogEntry[]) => buildLogsRows(data),
  refreshSeconds: 5 as number | null,
};
