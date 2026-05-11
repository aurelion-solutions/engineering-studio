/**
 * Shared types for the unified panel system.
 * No `vscode` import — unit-testable via `node --test`.
 */
import type { PipelineStatusKey } from "../integrations/pipelines/pipelineStatusDefs";

export type PanelContentKind = "application" | "inventory" | "events" | "logs" | "accessAnalysis" | "llmModel" | "llmModelsList" | "pipelineRuns" | "pipelineRunDetail" | "pipelineStepDetail" | "pipelineDefinitions" | "pipelineDefinitionDetail";

export type PanelRowAction = {
  verb: "cancel" | "retry";
  label: string;
};

export type PanelRow = {
  id: string;
  cells: PanelCell[];
  meta?: Record<string, string>;
  actions?: PanelRowAction[];
};

export type PanelCell = {
  kind: "text" | "badge" | "level" | "ts" | "kv" | "status" | "json";
  value: string;
  extra?: string;
};

export type Section = {
  title: string;
  columns: string[];
  rows: PanelRow[];
  meta?: { clickable?: "1"; routingKey?: string };
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
  | { kind: "logs"; ctxKey: string; minLevel: "debug" | "info" | "warning" | "error" }
  | { kind: "accessAnalysis"; ctxKey: string; categoryKey: string; label: string }
  | { kind: "itemDetail"; ctxKey: string; parentKind: "inventory" | "accessAnalysis"; categoryKey: string; itemId: string; label: string; item: Record<string, unknown> }
  | { kind: "llmModel"; ctxKey: string; modelId: string; label: string }
  | { kind: "llmModelsList"; ctxKey: string }
  | { kind: "pipelineRuns"; ctxKey: string; statusKey: PipelineStatusKey; label: string }
  | { kind: "pipelineRunDetail"; ctxKey: string; runId: string; pipelineName: string; status?: import("../api/types").PipelineRunStatus }
  | { kind: "pipelineStepDetail"; ctxKey: string; runId: string; stepName: string; pipelineName: string }
  | { kind: "pipelineDefinitions"; ctxKey: string }
  | { kind: "pipelineDefinitionDetail"; ctxKey: string; name: string };

export interface PanelRenderer<TData = unknown> {
  kind: PanelContentKind;
  title(ctx: PanelOpenArgs): string;
  columns(): string[];
  buildRows(data: TData): PanelRow[];
  refreshSeconds: number | null;
}
