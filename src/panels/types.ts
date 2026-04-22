/**
 * Shared types for the unified panel system.
 * No `vscode` import — unit-testable via `node --test`.
 */

export type PanelContentKind = "application" | "inventory" | "events" | "logs";

export type PanelRow = {
  id: string;
  cells: PanelCell[];
  meta?: Record<string, string>;
};

export type PanelCell = {
  kind: "text" | "badge" | "level" | "ts" | "kv" | "status";
  value: string;
  extra?: string;
};

export type Section = {
  title: string;
  columns: string[];
  rows: PanelRow[];
};

export type EditableFieldDef = {
  rowId: string;
  inputKind: "text" | "boolean" | "tags";
  currentValue: string;
};

export type EditConfig = {
  appId: string;
  fields: EditableFieldDef[];
};

export type PanelOpenArgs =
  | { kind: "application"; ctxKey: string; appId: string; appName: string }
  | { kind: "inventory"; ctxKey: string; categoryKey: string; label: string }
  | { kind: "events"; ctxKey: string; domain: "inventory" | "capabilities" | "platform" }
  | { kind: "logs"; ctxKey: string; minLevel: "debug" | "info" | "warning" | "error" };

export interface PanelRenderer<TData = unknown> {
  kind: PanelContentKind;
  title(ctx: PanelOpenArgs): string;
  columns(): string[];
  buildRows(data: TData): PanelRow[];
  refreshSeconds: number | null;
}
