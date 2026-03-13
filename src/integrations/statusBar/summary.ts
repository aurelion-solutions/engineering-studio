/**
 * Pure helper for computing the aggregated connector summary from loaded app nodes.
 *
 * UX invariant: apps whose children have NOT been loaded yet (instances === undefined)
 * are intentionally excluded from the count. Including unloaded apps would cause `total`
 * to jump as the user expands nodes, producing a confusing flickering status bar.
 *
 * If this behaviour is revisited (e.g. we decide to show total from app-level metadata
 * instead of loaded instances), update this function and the JSDoc in IMPLEMENTED.md.
 *
 * This module MUST NOT import `vscode` so it can be tested with `node --test`
 * without an extension host.
 */

export interface ConnectorSummary {
  readonly online: number;
  readonly total: number;
}

export interface AppSummaryInput {
  readonly instances: ReadonlyArray<{ readonly is_online: boolean }> | undefined;
}

/**
 * Computes the aggregated online/total connector count across all provided app inputs.
 *
 * Only apps with `instances !== undefined` (i.e. children have been loaded) are counted.
 * Apps with `instances: []` are counted as "loaded with zero connectors" (they contribute
 * 0 to both online and total — not skipped).
 */
export function computeConnectorSummary(
  apps: ReadonlyArray<AppSummaryInput>,
): ConnectorSummary {
  let online = 0;
  let total = 0;

  for (const app of apps) {
    if (app.instances === undefined) {
      // Children not yet loaded — exclude from count (see UX invariant above)
      continue;
    }

    for (const instance of app.instances) {
      total += 1;
      if (instance.is_online) {
        online += 1;
      }
    }
  }

  return { online, total };
}
