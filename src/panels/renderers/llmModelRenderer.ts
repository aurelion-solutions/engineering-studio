/**
 * Renderer for LLM model detail panels.
 * Pure buildRows/columns/sections — no vscode dep.
 */

import type { LLMModelFromApi, LLMExecutionProfileFromApi } from "../../api/types";
import type { PanelRow, Section } from "../types";

export function llmModelColumns(): string[] {
  return ["Field", "Value"];
}

export function buildLlmModelRows(model: LLMModelFromApi): PanelRow[] {
  const kvPairs: Array<[string, string]> = [
    ["id", model.id],
    ["name", model.name],
    ["description", model.description ?? ""],
    ["provider", model.provider],
    ["local_path", model.local_path ?? ""],
    ["endpoint_url", model.endpoint_url ?? ""],
    ["model_ref", model.model_ref ?? ""],
    ["context_window", model.context_window !== null ? String(model.context_window) : ""],
    ["max_total_tokens", model.max_total_tokens !== null ? String(model.max_total_tokens) : ""],
    ["default_params", JSON.stringify(model.default_params)],
    ["secret_id", model.secret_id ?? ""],
    ["is_active", String(model.is_active)],
    ["created_at", model.created_at],
    ["updated_at", model.updated_at],
  ];
  return kvPairs.map(([key, value]) => ({
    id: `kv-${key}`,
    cells: [
      { kind: "kv" as const, value: key },
      { kind: "text" as const, value },
    ],
  }));
}

export function buildLlmModelProfilesSection(
  profiles: LLMExecutionProfileFromApi[],
): Section {
  const columns = ["id", "name", "param_overrides", "created_at"];
  if (profiles.length === 0) {
    return {
      title: "Execution Profiles",
      columns,
      rows: [],
    };
  }
  const rows: PanelRow[] = profiles.map((p) => ({
    id: `profile-${p.id}`,
    cells: [
      { kind: "text" as const, value: p.id },
      { kind: "text" as const, value: p.name },
      { kind: "text" as const, value: JSON.stringify(p.param_overrides) },
      { kind: "text" as const, value: p.created_at },
    ],
  }));
  return {
    title: "Execution Profiles",
    columns,
    rows,
  };
}
