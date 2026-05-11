import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dispatchPipelineAction } from "../pipelineActionDispatch";
import type { PipelineActionDeps, PipelineActionMsg } from "../pipelineActionDispatch";
import type { CancelPipelineRunResponseFromApi, RetryPipelineRunResponseFromApi } from "../../api/types";

function makeDeps(overrides: Partial<PipelineActionDeps> = {}): PipelineActionDeps & {
  calls: { showInfo: string[]; showError: string[]; logError: string[]; refreshCount: number };
} {
  const calls = { showInfo: [] as string[], showError: [] as string[], logError: [] as string[], refreshCount: 0 };
  return {
    cancelFn: async (_runId: string): Promise<CancelPipelineRunResponseFromApi> =>
      ({ run_id: _runId, status: "cancelled" }),
    retryFn: async (_runId: string): Promise<RetryPipelineRunResponseFromApi> =>
      ({ run_id: "new-run-id-abc", retry_of_run_id: _runId, status: "pending", pipeline_name: "pipe", pipeline_version: 1 }),
    confirm: async (_msg: string) => true,
    showInfo: (msg: string) => { calls.showInfo.push(msg); },
    showError: (msg: string) => { calls.showError.push(msg); },
    logError: (msg: string) => { calls.logError.push(msg); },
    refresh: () => { calls.refreshCount++; },
    calls,
    ...overrides,
  };
}

describe("dispatchPipelineAction", () => {
  it("cancel_verb_routes_to_cancelFn", async () => {
    let cancelledId: string | undefined;
    const deps = makeDeps({
      cancelFn: async (id) => {
        cancelledId = id;
        return { run_id: id, status: "cancelled" };
      },
    });
    const msg: PipelineActionMsg = { verb: "cancel", runId: "run-abc-123" };
    await dispatchPipelineAction(deps, msg);
    assert.equal(cancelledId, "run-abc-123");
    assert.equal(deps.calls.refreshCount, 1);
    assert.ok(deps.calls.showInfo[0]?.includes("cancelled"));
  });

  it("retry_verb_routes_to_retryFn", async () => {
    let retriedId: string | undefined;
    const deps = makeDeps({
      retryFn: async (id) => {
        retriedId = id;
        return { run_id: "new-xyz", retry_of_run_id: id, status: "pending", pipeline_name: "pipe", pipeline_version: 1 };
      },
    });
    const msg: PipelineActionMsg = { verb: "retry", runId: "run-def-456" };
    await dispatchPipelineAction(deps, msg);
    assert.equal(retriedId, "run-def-456");
    assert.equal(deps.calls.refreshCount, 1);
    assert.ok(deps.calls.showInfo[0]?.includes("new-xyz".slice(0, 8)));
  });

  it("confirmation_dismissed_does_not_call_fetcher", async () => {
    let cancelCalled = false;
    const deps = makeDeps({
      confirm: async (_msg: string) => false,
      cancelFn: async (id) => { cancelCalled = true; return { run_id: id, status: "cancelled" }; },
    });
    const msg: PipelineActionMsg = { verb: "cancel", runId: "run-ghi-789" };
    await dispatchPipelineAction(deps, msg);
    assert.equal(cancelCalled, false);
    assert.equal(deps.calls.refreshCount, 0);
    assert.equal(deps.calls.showInfo.length, 0);
  });

  it("fetcher_error_surfaces_via_showError", async () => {
    const deps = makeDeps({
      cancelFn: async () => { throw new Error("409 Already cancelling"); },
    });
    const msg: PipelineActionMsg = { verb: "cancel", runId: "run-err-000" };
    await dispatchPipelineAction(deps, msg);
    assert.equal(deps.calls.refreshCount, 0);
    assert.ok(deps.calls.showError[0]?.includes("409"));
    assert.ok(deps.calls.logError[0]?.includes("409"));
  });
});
