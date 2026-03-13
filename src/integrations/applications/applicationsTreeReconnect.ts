/**
 * Pure helpers for the auto-reconnect poller logic in ApplicationsTreeDataProvider.
 *
 * No vscode import — these are unit-testable in plain node:test.
 *
 * Invariants:
 *  - Reconnect interval is started exactly once, on the 0 → 1 consecutive-failure transition.
 *  - Reconnect interval is cleared on the first successful refresh (consecutiveFailures resets to 0).
 *  - If a timer already exists (defensive: rare race between tick and reentrancy guard), do not start a second one.
 */

/**
 * Returns true when a new reconnect interval should be started.
 *
 * @param wasZero  - whether consecutiveFailures was 0 before the current failure increment
 * @param hasTimer - whether a reconnectTimer handle is already held
 */
export function shouldStartReconnect(wasZero: boolean, hasTimer: boolean): boolean {
  return wasZero && !hasTimer;
}

/**
 * Returns true when the existing reconnect interval should be cleared.
 *
 * @param consecutiveFailures - current value (already reset to 0 on success path before this call)
 * @param hasTimer            - whether a reconnectTimer handle is held
 */
export function shouldStopReconnect(consecutiveFailures: number, hasTimer: boolean): boolean {
  return consecutiveFailures === 0 && hasTimer;
}
