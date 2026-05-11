/**
 * Renderer for pipeline run detail panels.
 * Pure module — no `vscode` import, no wall-clock calls, deterministic output.
 */

import type {
  PipelineRunDetailFromApi,
  PipelineRunStatus,
  PipelineDetailFromApi,
  StepRunSummaryFromApi,
  StepRunStatus,
} from "../../api/types";
import type { PanelRow, Section } from "../types";
import {
  classifyStep,
  buildNodeLabel,
} from "./pipelineDagShared";
import type { DagDescriptor } from "./pipelineDagShared";

/**
 * Terminal statuses — runs in these states will not change further.
 * Exported for use in DetailPanelController polling logic.
 */
export const TERMINAL_RUN_STATUSES: ReadonlySet<PipelineRunStatus> = new Set([
  "completed",
  "failed",
  "failed_timeout",
  "cancelled",
]);

export function pipelineRunDetailHeaderColumns(): string[] {
  return ["Field", "Value"];
}

function formatArgs(args: Record<string, unknown>): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return "<unserializable>";
  }
}

export function buildPipelineRunDetailHeaderRows(
  detail: PipelineRunDetailFromApi,
): PanelRow[] {
  return [
    { id: "pipeline_name",  cells: [{ kind: "kv", value: "pipeline_name" },  { kind: "text",   value: detail.pipeline_name }] },
    { id: "version",        cells: [{ kind: "kv", value: "version" },         { kind: "badge",  value: String(detail.pipeline_version) }] },
    { id: "status",         cells: [{ kind: "kv", value: "status" },          { kind: "status", value: detail.status }] },
    { id: "trigger_source", cells: [{ kind: "kv", value: "trigger_source" },  { kind: "text",   value: detail.trigger_source }] },
    { id: "current_step",   cells: [{ kind: "kv", value: "current_step" },    { kind: "text",   value: detail.current_step ?? "" }] },
    { id: "started_at",     cells: [{ kind: "kv", value: "started_at" },      { kind: "ts",     value: detail.started_at ?? "" }] },
    { id: "finished_at",    cells: [{ kind: "kv", value: "finished_at" },     { kind: "ts",     value: detail.finished_at ?? "" }] },
    { id: "created_at",     cells: [{ kind: "kv", value: "created_at" },      { kind: "ts",     value: detail.created_at }] },
    { id: "updated_at",     cells: [{ kind: "kv", value: "updated_at" },      { kind: "ts",     value: detail.updated_at }] },
    { id: "error",          cells: [{ kind: "kv", value: "error" },           { kind: "text",   value: detail.error ?? "" }] },
    { id: "content_hash",   cells: [{ kind: "kv", value: "content_hash" },    { kind: "text",   value: detail.content_hash }] },
    { id: "args",           cells: [{ kind: "kv", value: "args" },            { kind: "json",   value: formatArgs(detail.args) }] },
  ];
}

export function pipelineRunDetailStepsColumns(): string[] {
  return ["Step", "Attempt", "Status", "Started", "Finished", "Error"];
}

export function buildPipelineRunDetailStepsSection(
  detail: PipelineRunDetailFromApi,
): Section {
  const rows: PanelRow[] =
    detail.steps.length === 0
      ? [
          {
            id: "no-steps",
            cells: [
              { kind: "text", value: "No steps yet" },
              { kind: "text", value: "" },
              { kind: "text", value: "" },
              { kind: "text", value: "" },
              { kind: "text", value: "" },
              { kind: "text", value: "" },
            ],
          },
        ]
      : detail.steps.map((s) => ({
          id: s.step_name,
          cells: [
            { kind: "text" as const,   value: s.step_name },
            { kind: "badge" as const,  value: String(s.attempt) },
            { kind: "status" as const, value: s.status },
            { kind: "ts" as const,     value: s.started_at ?? "" },
            { kind: "ts" as const,     value: s.finished_at ?? "" },
            { kind: "text" as const,   value: s.error ?? "" },
          ],
        }));

  return {
    title: "Steps",
    columns: pipelineRunDetailStepsColumns(),
    rows,
    meta: { clickable: "1", routingKey: "steps" },
  };
}

// ─── Run DAG builder ──────────────────────────────────────────────────────────

/**
 * Sentinel value placed in argsByStep for definition steps that have no
 * matching run-step (e.g. pending downstream steps in a new run).
 */
type PendingStepSentinel = {
  step_id: null;
  status: StepRunStatus;
  attempt: number;
  error: null;
  started_at: null;
  finished_at: null;
  /** Planned args from the pipeline definition for this step (YAML source).
   *  Shown when the user clicks an orphan node that has no step_run record. */
  definition_args: unknown;
};

type RunStepSummary = {
  step_id: string;
  status: StepRunStatus;
  attempt: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
};

/**
 * Build a DagDescriptor for a pipeline run, overlaying per-step run statuses
 * onto the definition's topology.
 *
 * Algorithm:
 * 1. Build name→latestStepRun map from run.steps[] (latest attempt wins).
 * 2. Iterate definition.steps[] to emit nodes/edges.
 * 3. Each node gets `status` if there is a matching run step; otherwise omitted.
 * 4. argsByStep carries { step_id, status, attempt, error, started_at, finished_at }
 *    from the matching step_run (lazy args/result are fetched on tap).
 *    Definition-only steps get a pending sentinel.
 * 5. Run-only steps (drift) are skipped and reported as warnings.
 */
/**
 * Map a run-level terminal status onto orphan-step status so the DAG visually
 * reflects the run's outcome when individual step records are missing.
 * Returns undefined when the run is active or in a partial-failure state where
 * propagating run.status onto unknown steps would mislead.
 */
function inheritStatusFromRun(runStatus: PipelineRunStatus): StepRunStatus | undefined {
  switch (runStatus) {
    case "cancelled":
    case "cancelling":
      return "cancelled";
    default:
      return undefined;
  }
}

export function buildPipelineRunDag(
  run: PipelineRunDetailFromApi,
  definition: PipelineDetailFromApi,
): DagDescriptor {
  const defSteps = definition.steps as Record<string, unknown>[];

  if (defSteps.length === 0) {
    return { elements: [], argsByStep: {}, warnings: [] };
  }

  // Build name → latest StepRunSummaryFromApi map from run steps.
  // "Latest" = highest attempt integer; tie-break by position in array (last wins).
  const latestRunStep = new Map<string, StepRunSummaryFromApi>();
  for (const s of run.steps) {
    const existing = latestRunStep.get(s.step_name);
    if (existing === undefined || s.attempt > existing.attempt) {
      latestRunStep.set(s.step_name, s);
    }
  }

  // Detect drift: run-only steps (in run but not in definition)
  const defStepNames = new Set<string>();
  defSteps.forEach((step, i) => {
    const name = typeof step["name"] === "string" ? step["name"] : `step-${i}`;
    defStepNames.add(name);
  });

  const warnings: string[] = [];
  for (const runStep of run.steps) {
    if (!defStepNames.has(runStep.step_name)) {
      // Deduplicate: only warn once per drift step name
      if (!warnings.some((w) => w.includes(`'${runStep.step_name}'`))) {
        warnings.push(
          `step '${runStep.step_name}' present in run but not in current definition (content_hash drift)`,
        );
      }
    }
  }

  // Build name → index map for edge resolution
  const nameToIndex = new Map<string, number>();
  defSteps.forEach((step, i) => {
    const name = typeof step["name"] === "string" ? step["name"] : `step-${i}`;
    nameToIndex.set(name, i);
  });

  const elements: DagDescriptor["elements"] = [];
  const argsByStep: Record<string, PendingStepSentinel | RunStepSummary> = {};

  // Emit nodes
  defSteps.forEach((step, i) => {
    const name = typeof step["name"] === "string" ? step["name"] : `step-${i}`;
    const kind = classifyStep(step);
    const label = buildNodeLabel(step, kind);
    const matchedRun = latestRunStep.get(name);

    const nodeData: {
      id: string;
      name: string;
      label: string;
      kind: typeof kind;
      status?: StepRunStatus;
    } = { id: `step_${i}`, name, label, kind };

    if (matchedRun !== undefined) {
      nodeData.status = matchedRun.status;
      argsByStep[name] = {
        step_id: matchedRun.id,
        status: matchedRun.status,
        attempt: matchedRun.attempt,
        error: matchedRun.error,
        started_at: matchedRun.started_at,
        finished_at: matchedRun.finished_at,
      };
    } else {
      // Definition-only step — propagate run-level status when the run is in a
      // terminal "did-not-execute" state so the whole DAG visually reflects the
      // run's outcome. For active or partial-failure runs we leave the node
      // status unset (baseline color) to avoid misrepresenting unknown state.
      const inheritedStatus = inheritStatusFromRun(run.status);
      if (inheritedStatus !== undefined) {
        nodeData.status = inheritedStatus;
      }
      argsByStep[name] = {
        step_id: null,
        status: inheritedStatus ?? "pending",
        attempt: 0,
        error: null,
        started_at: null,
        finished_at: null,
        definition_args: step["args"] ?? null,
      };
    }

    elements.push({ data: nodeData });
  });

  // Emit edges
  defSteps.forEach((step, targetIndex) => {
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
