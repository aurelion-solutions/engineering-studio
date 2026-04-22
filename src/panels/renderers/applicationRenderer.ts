/**
 * Renderer for application detail panels.
 * Pure buildRows/title/columns — no vscode dep.
 */

import type { ApplicationFromApi, ConnectorInstanceFromApi } from "../../api/types";
import type { EditConfig, PanelOpenArgs, PanelRow, Section } from "../types";

export type ApplicationDetailData = {
  app: ApplicationFromApi;
  connectors: ConnectorInstanceFromApi[];
};

export function applicationTitle(ctx: PanelOpenArgs): string {
  if (ctx.kind !== "application") {
    return "Application";
  }
  return `Application: ${ctx.appName}`;
}

export function applicationColumns(): string[] {
  return ["Field", "Value"];
}

function formatTs(iso: string): string {
  const m = /(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(iso);
  return m ? `UTC ${m[1]} ${m[2]}` : iso;
}

export function buildApplicationRows(data: ApplicationDetailData): PanelRow[] {
  const { app } = data;
  const kvPairs: Array<[string, string]> = [
    ["name", app.name],
    ["code", app.code],
    ["is_active", String(app.is_active)],
    ["required_tags", app.required_connector_tags.join(", ") || "(none)"],
    ["created", formatTs(app.created_at)],
    ["updated", formatTs(app.updated_at)],
  ];
  return kvPairs.map(([key, value]) => ({
    id: `kv-${key}`,
    cells: [
      { kind: "kv" as const, value: key },
      { kind: "text" as const, value },
    ],
  }));
}

export function buildConnectorSection(connectors: ConnectorInstanceFromApi[]): Section {
  const columns = ["Status", "Instance ID", "Tags", "Last Seen", "Created"];
  if (connectors.length === 0) {
    return {
      title: "Connectors",
      columns,
      rows: [{
        id: "no-connectors",
        cells: [
          { kind: "text", value: "—" },
          { kind: "text", value: "No connectors found" },
          { kind: "text", value: "" },
          { kind: "text", value: "" },
          { kind: "text", value: "" },
        ],
      }],
    };
  }
  return {
    title: "Connectors",
    columns,
    rows: connectors.map((c) => ({
      id: `connector-${c.id}`,
      cells: [
        { kind: "status" as const, value: c.is_online ? "Online" : "Offline" },
        { kind: "text" as const, value: c.instance_id },
        { kind: "text" as const, value: c.tags.join(", ") || "—" },
        { kind: "ts" as const, value: formatTs(c.last_seen_at) },
        { kind: "ts" as const, value: formatTs(c.created_at) },
      ],
    })),
  };
}

export function buildEditConfig(app: ApplicationFromApi): EditConfig {
  return {
    appId: app.id,
    fields: [
      { rowId: "kv-name", inputKind: "text", currentValue: app.name },
      { rowId: "kv-is_active", inputKind: "boolean", currentValue: String(app.is_active) },
      { rowId: "kv-required_tags", inputKind: "tags", currentValue: app.required_connector_tags.join(", ") },
    ],
  };
}

export const applicationRenderer = {
  kind: "application" as const,
  title: applicationTitle,
  columns: applicationColumns,
  buildRows: buildApplicationRows,
  refreshSeconds: null as null,
};
