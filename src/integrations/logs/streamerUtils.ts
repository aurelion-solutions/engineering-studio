/**
 * Pure helpers for LogStreamer — no vscode or platformClient dependency.
 * Kept in a separate module so unit tests can import without requiring vscode.
 */

/**
 * Computes the next newestTs value from a batch of log events.
 *
 * For ASC order (incremental): returns the timestamp of the last event.
 * For DESC order (seed): returns the timestamp of the first event
 *   (which is the newest — caller reverses the batch before feeding to the channel).
 * Empty batch: returns currentNewestTs unchanged.
 */
export function computeNextNewestTs(
  currentNewestTs: string | undefined,
  batch: ReadonlyArray<{ readonly timestamp: string }>,
  order: "asc" | "desc",
): string | undefined {
  if (batch.length === 0) {
    return currentNewestTs;
  }
  if (order === "desc") {
    // Seed path: DESC response → first element is newest
    return batch[0].timestamp;
  }
  // Incremental path: ASC response → last element is newest
  return batch[batch.length - 1].timestamp;
}
