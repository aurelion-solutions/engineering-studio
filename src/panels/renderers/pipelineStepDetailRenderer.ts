/**
 * Renderer for pipeline step detail panels.
 * Pure module — no `vscode` import, no wall-clock calls, deterministic output.
 */

import type { StepRunDetailFromApi } from "../../api/types";
import type { PanelRow } from "../types";

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "<unserializable>";
  }
}

export function pipelineStepDetailHeaderColumns(): string[] {
  return ["Field", "Value"];
}

export function buildPipelineStepDetailHeaderRows(
  detail: StepRunDetailFromApi,
): PanelRow[] {
  return [
    { id: "step_name",   cells: [{ kind: "kv",     value: "step_name" },   { kind: "text",   value: detail.step_name }] },
    { id: "attempt",     cells: [{ kind: "kv",     value: "attempt" },     { kind: "badge",  value: String(detail.attempt) }] },
    { id: "status",      cells: [{ kind: "kv",     value: "status" },      { kind: "status", value: detail.status }] },
    { id: "started_at",  cells: [{ kind: "kv",     value: "started_at" },  { kind: "ts",     value: detail.started_at ?? "" }] },
    { id: "finished_at", cells: [{ kind: "kv",     value: "finished_at" }, { kind: "ts",     value: detail.finished_at ?? "" }] },
    { id: "error",       cells: [{ kind: "kv",     value: "error" },       { kind: "text",   value: detail.error ?? "" }] },
    { id: "args",        cells: [{ kind: "kv",     value: "args" },        { kind: "json",   value: safeStringify(detail.args) }] },
    { id: "result",      cells: [{ kind: "kv",     value: "result" },      { kind: "json",   value: detail.result !== null ? safeStringify(detail.result) : "" }] },
    { id: "id",          cells: [{ kind: "kv",     value: "id" },          { kind: "text",   value: detail.id }] },
  ];
}
