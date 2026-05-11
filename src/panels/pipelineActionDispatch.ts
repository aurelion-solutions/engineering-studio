/**
 * Pure dispatch helper for pipeline run cancel/retry actions.
 * No `vscode` import — fully injectable, testable via `node --test`.
 */

import type { CancelPipelineRunResponseFromApi, RetryPipelineRunResponseFromApi } from "../api/types";

export type PipelineActionMsg = {
  verb: "cancel" | "retry";
  runId: string;
};

export type PipelineActionDeps = {
  cancelFn: (runId: string) => Promise<CancelPipelineRunResponseFromApi>;
  retryFn: (runId: string) => Promise<RetryPipelineRunResponseFromApi>;
  confirm: (message: string) => Promise<boolean>;
  showInfo: (message: string) => void;
  showError: (message: string) => void;
  logError: (message: string) => void;
  refresh: () => void;
};

export async function dispatchPipelineAction(
  deps: PipelineActionDeps,
  msg: PipelineActionMsg,
): Promise<void> {
  const shortId = msg.runId.slice(0, 8);

  const prompt =
    msg.verb === "cancel"
      ? `Cancel pipeline run ${shortId}?`
      : `Retry pipeline run ${shortId}? A new run will be created.`;

  const confirmed = await deps.confirm(prompt);
  if (!confirmed) {
    return;
  }

  try {
    if (msg.verb === "cancel") {
      const res = await deps.cancelFn(msg.runId);
      const label = res.status === "cancelled" ? "cancelled" : "cancellation requested";
      deps.showInfo(`Run ${shortId}: ${label}.`);
    } else {
      const res = await deps.retryFn(msg.runId);
      const newShortId = res.run_id.slice(0, 8);
      deps.showInfo(`Retry queued — new run ${newShortId}.`);
    }
    deps.refresh();
  } catch (err) {
    deps.logError(String(err));
    deps.showError(String(err));
  }
}
