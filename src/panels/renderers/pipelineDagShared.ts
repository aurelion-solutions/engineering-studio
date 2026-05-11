/**
 * Shared DAG types and pure helpers used by both pipeline definition and
 * pipeline run detail renderers.
 * Pure module — no `vscode` import, no wall-clock calls.
 */

import type { StepRunStatus } from "../../api/types";

export type DagNodeKind = "engine_call" | "wait_for_event" | "unknown";

export type DagNodeData = {
  data: {
    id: string;
    name: string;
    label: string;
    kind: DagNodeKind;
    status?: StepRunStatus;
  };
};

export type DagEdgeData = {
  data: { id: string; source: string; target: string };
};

export type DagElement = DagNodeData | DagEdgeData;

export type DagDescriptor = {
  elements: DagElement[];
  argsByStep: Record<string, unknown>;
  warnings: string[];
};

export function classifyStep(step: Record<string, unknown>): DagNodeKind {
  if (step["type"] === "wait_for_event") {
    return "wait_for_event";
  }
  const engine = typeof step["engine"] === "string" ? step["engine"] : undefined;
  const action = typeof step["action"] === "string" ? step["action"] : undefined;
  if (engine !== undefined && action !== undefined) {
    return "engine_call";
  }
  return "unknown";
}

export function buildNodeLabel(step: Record<string, unknown>, kind: DagNodeKind): string {
  const name = typeof step["name"] === "string" ? step["name"] : "";
  if (kind === "engine_call") {
    const engine = step["engine"] as string;
    const action = step["action"] as string;
    return `${name}\n${engine}.${action}`;
  }
  if (kind === "wait_for_event") {
    return `${name}\nwait_for_event`;
  }
  return `${name}\n<unknown>`;
}
