/**
 * Pure domain definitions for the Pipelines tree.
 * No `vscode` import — unit-testable via `node --test`.
 *
 * Status key order:
 *   definitions, running, pending, awaiting_event, failed,
 *   failed_timeout, cancelled, completed
 *
 * `definitions` leads the list as a UI-only marker (no enum counterpart);
 * the tree renders a visual separator after it (see tree.ts).
 *
 * The remaining 7 keys are real PipelineRunStatus enum values
 * (aurelion-kernel/src/platform/orchestrator/models.py:26–41).
 * `cancelling` is deliberately omitted — it is a transient state
 * surfaced under `running` in Step 25b.
 * `failed_timeout` is a real kernel enum value (models.py:40).
 */

export type PipelineStatusKey =
  | "definitions"
  | "running"
  | "pending"
  | "awaiting_event"
  | "failed"
  | "failed_timeout"
  | "cancelled"
  | "completed";

export type PipelineStatusDef = {
  key: PipelineStatusKey;
  label: string;
  iconId: string;
};

export function buildPipelineStatusDefs(): PipelineStatusDef[] {
  return [
    { key: "definitions", label: "Definitions", iconId: "list-unordered" },
    { key: "running", label: "Running", iconId: "sync" },
    { key: "pending", label: "Pending", iconId: "clock" },
    { key: "awaiting_event", label: "Awaiting Event", iconId: "bell" },
    { key: "failed", label: "Failed", iconId: "error" },
    { key: "failed_timeout", label: "Failed (Timeout)", iconId: "watch" },
    { key: "cancelled", label: "Cancelled", iconId: "circle-slash" },
    { key: "completed", label: "Completed", iconId: "check" },
  ];
}
