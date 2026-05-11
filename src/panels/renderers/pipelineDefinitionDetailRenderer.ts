/**
 * Renderer for the pipeline definition detail panel.
 * Pure module — no `vscode` import, no wall-clock calls, deterministic output.
 */

import type { PipelineDetailFromApi } from "../../api/types";
import type { PanelRow, Section } from "../types";
import {
  classifyStep,
  buildNodeLabel,
} from "./pipelineDagShared";

// Re-export shared DAG types for backward compatibility with importers that
// reference them from this module (e.g. DetailPanelController).
export type {
  DagNodeKind,
  DagNodeData,
  DagEdgeData,
  DagElement,
  DagDescriptor,
} from "./pipelineDagShared";

export function pipelineDefinitionHeaderColumns(): string[] {
  return ["Field", "Value"];
}

export function buildPipelineDefinitionHeaderRows(
  detail: PipelineDetailFromApi,
): PanelRow[] {
  return [
    { id: "name",          cells: [{ kind: "kv", value: "name" },          { kind: "text",  value: detail.name }] },
    { id: "version",       cells: [{ kind: "kv", value: "version" },       { kind: "badge", value: String(detail.version) }] },
    { id: "schema_version",cells: [{ kind: "kv", value: "schema_version" },{ kind: "badge", value: String(detail.schema_version) }] },
    { id: "description",   cells: [{ kind: "kv", value: "description" },   { kind: "text",  value: detail.description ?? "" }] },
    { id: "step_count",    cells: [{ kind: "kv", value: "step_count" },    { kind: "text",  value: String(detail.step_count) }] },
    { id: "content_hash",  cells: [{ kind: "kv", value: "content_hash" },  { kind: "text",  value: detail.content_hash }] },
    { id: "source_path",   cells: [{ kind: "kv", value: "source_path" },   { kind: "text",  value: detail.source_path }] },
  ];
}

export function pipelineDefinitionTriggersColumns(): string[] {
  return ["Type", "Routing key", "Cron / Every", "Match"];
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "<unserializable>";
  }
}

export function buildPipelineDefinitionTriggersSection(
  detail: PipelineDetailFromApi,
): Section {
  if (detail.triggers.length === 0) {
    return {
      title: "Triggers",
      columns: pipelineDefinitionTriggersColumns(),
      rows: [
        {
          id: "no-triggers",
          cells: [
            { kind: "text", value: "No triggers" },
            { kind: "text", value: "" },
            { kind: "text", value: "" },
            { kind: "text", value: "" },
          ],
        },
      ],
    };
  }

  const rows: PanelRow[] = detail.triggers.map((t, i) => {
    const cronEvery = t.cron ?? t.every ?? "";
    return {
      id: `trigger-${i}`,
      cells: [
        { kind: "badge" as const, value: t.type },
        { kind: "text" as const,  value: t.routing_key ?? "" },
        { kind: "text" as const,  value: cronEvery },
        { kind: "text" as const,  value: t.match !== undefined && t.match !== null ? safeStringify(t.match) : "" },
      ],
    };
  });

  return {
    title: "Triggers",
    columns: pipelineDefinitionTriggersColumns(),
    rows,
  };
}

// ─── DAG builder ──────────────────────────────────────────────────────────────

export function buildPipelineDefinitionDag(
  detail: PipelineDetailFromApi,
): import("./pipelineDagShared").DagDescriptor {
  const steps = detail.steps as Record<string, unknown>[];

  if (steps.length === 0) {
    return { elements: [], argsByStep: {}, warnings: [] };
  }

  // Build name → index map for edge resolution
  const nameToIndex = new Map<string, number>();
  steps.forEach((step, i) => {
    const name = typeof step["name"] === "string" ? step["name"] : `step-${i}`;
    nameToIndex.set(name, i);
  });

  const elements: import("./pipelineDagShared").DagElement[] = [];
  const argsByStep: Record<string, unknown> = {};
  const warnings: string[] = [];

  // Emit nodes
  steps.forEach((step, i) => {
    const name = typeof step["name"] === "string" ? step["name"] : `step-${i}`;
    const kind = classifyStep(step);
    const label = buildNodeLabel(step, kind);
    elements.push({
      data: { id: `step_${i}`, name, label, kind },
    });
    argsByStep[name] = step["args"] !== undefined ? step["args"] : null;
  });

  // Emit edges
  steps.forEach((step, targetIndex) => {
    const stepName = typeof step["name"] === "string" ? step["name"] : `step-${targetIndex}`;
    const requires = step["requires"];
    if (!Array.isArray(requires)) {
      return;
    }
    for (const req of requires) {
      if (typeof req !== "string") {
        continue;
      }
      const sourceIndex = nameToIndex.get(req);
      if (sourceIndex === undefined) {
        warnings.push(`step '${stepName}' requires unknown step '${req}'`);
        continue;
      }
      elements.push({
        data: {
          id: `edge_${sourceIndex}_${targetIndex}`,
          source: `step_${sourceIndex}`,
          target: `step_${targetIndex}`,
        },
      });
    }
  });

  return { elements, argsByStep, warnings };
}
