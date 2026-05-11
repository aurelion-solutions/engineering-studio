import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pipelineRunsColumns,
  buildPipelineRunsRows,
  formatDuration,
  actionsForRunStatus,
} from "../pipelineRunsListRenderer";
import type { PipelineRunSummaryFromApi } from "../../../api/types";

function makeRun(overrides: Partial<PipelineRunSummaryFromApi> = {}): PipelineRunSummaryFromApi {
  return {
    id: "run-id-1",
    pipeline_name: "my-pipeline",
    pipeline_version: 1,
    content_hash: "abc123",
    status: "completed",
    trigger_source: "manual",
    current_step: null,
    started_at: "2026-05-11T12:00:00Z",
    finished_at: "2026-05-11T12:01:00Z",
    error: null,
    created_at: "2026-05-11T11:59:00Z",
    updated_at: "2026-05-11T12:01:00Z",
    ...overrides,
  };
}

describe("pipelineRunsColumns", () => {
  it("columns_order_is_exact_and_stable", () => {
    assert.deepEqual(pipelineRunsColumns(), [
      "Pipeline",
      "Status",
      "Started",
      "Current Step",
      "Duration",
      "Created",
    ]);
  });
});

describe("buildPipelineRunsRows", () => {
  it("row_count_equals_input_length", () => {
    const runs = [makeRun({ id: "a" }), makeRun({ id: "b" }), makeRun({ id: "c" })];
    assert.equal(buildPipelineRunsRows(runs).length, 3);
  });

  it("started_cell_is_ts_kind_with_raw_iso", () => {
    const run = makeRun({ started_at: "2026-05-11T12:00:00Z" });
    const rows = buildPipelineRunsRows([run]);
    const startedCell = rows[0].cells[2];
    assert.equal(startedCell.kind, "ts");
    assert.equal(startedCell.value, "2026-05-11T12:00:00Z");
  });

  it("current_step_empty_when_null", () => {
    const run = makeRun({ current_step: null });
    const rows = buildPipelineRunsRows([run]);
    const stepCell = rows[0].cells[3];
    assert.equal(stepCell.kind, "text");
    assert.equal(stepCell.value, "");
  });

  it("duration_completed_under_60s", () => {
    const run = makeRun({
      started_at: "2026-05-11T12:00:00Z",
      finished_at: "2026-05-11T12:00:30Z",
    });
    const rows = buildPipelineRunsRows([run]);
    const durationCell = rows[0].cells[4];
    assert.equal(durationCell.value, "30s");
  });

  it("duration_completed_over_60s", () => {
    const run = makeRun({
      started_at: "2026-05-11T12:00:00Z",
      finished_at: "2026-05-11T12:01:30Z",
    });
    const rows = buildPipelineRunsRows([run]);
    const durationCell = rows[0].cells[4];
    assert.equal(durationCell.value, "1m 30s");
  });

  it("duration_running_renders_ellipsis", () => {
    const run = makeRun({ started_at: "2026-05-11T12:00:00Z", finished_at: null });
    const rows = buildPipelineRunsRows([run]);
    const durationCell = rows[0].cells[4];
    assert.equal(durationCell.value, "…");
  });

  it("duration_pending_renders_empty", () => {
    const run = makeRun({ started_at: null, finished_at: null });
    const rows = buildPipelineRunsRows([run]);
    const durationCell = rows[0].cells[4];
    assert.equal(durationCell.value, "");
  });

  it("id_field_is_run_id", () => {
    const run = makeRun({ id: "unique-run-id-99" });
    const rows = buildPipelineRunsRows([run]);
    assert.equal(rows[0].id, "unique-run-id-99");
  });

  it("every_row_has_clickable_meta", () => {
    const runs = [
      makeRun({ id: "a", status: "pending" }),
      makeRun({ id: "b", status: "running" }),
      makeRun({ id: "c", status: "completed" }),
    ];
    const rows = buildPipelineRunsRows(runs);
    assert.ok(
      rows.every((r) => r.meta?.clickable === "1"),
      "every row must have meta.clickable === '1'",
    );
  });
});

describe("formatDuration", () => {
  it("duration_negative_clock_skew", () => {
    // finished before started
    assert.equal(
      formatDuration("2026-05-11T12:01:00Z", "2026-05-11T12:00:00Z"),
      "",
    );
  });
});

describe("actionsForRunStatus", () => {
  it("actions_for_running_status_includes_cancel", () => {
    assert.deepEqual(actionsForRunStatus("running"), [{ verb: "cancel", label: "Cancel" }]);
  });

  it("actions_for_pending_status_includes_cancel", () => {
    assert.deepEqual(actionsForRunStatus("pending"), [{ verb: "cancel", label: "Cancel" }]);
  });

  it("actions_for_awaiting_event_status_includes_cancel", () => {
    assert.deepEqual(actionsForRunStatus("awaiting_event"), [{ verb: "cancel", label: "Cancel" }]);
  });

  it("actions_for_completed_status_includes_retry", () => {
    assert.deepEqual(actionsForRunStatus("completed"), [{ verb: "retry", label: "Retry" }]);
  });

  it("actions_for_failed_status_includes_retry", () => {
    assert.deepEqual(actionsForRunStatus("failed"), [{ verb: "retry", label: "Retry" }]);
  });

  it("actions_for_failed_timeout_status_includes_retry", () => {
    assert.deepEqual(actionsForRunStatus("failed_timeout"), [{ verb: "retry", label: "Retry" }]);
  });

  it("actions_for_cancelled_status_includes_retry", () => {
    assert.deepEqual(actionsForRunStatus("cancelled"), [{ verb: "retry", label: "Retry" }]);
  });

  it("actions_for_cancelling_status_is_empty", () => {
    assert.deepEqual(actionsForRunStatus("cancelling"), []);
  });
});
