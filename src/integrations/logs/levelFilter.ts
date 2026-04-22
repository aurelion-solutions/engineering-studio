/**
 * Pure level-selector for minimum-level log filtering.
 * No `vscode` import — unit-testable via `node --test`.
 */

/**
 * Returns the set of log levels to fetch for a given minimum level.
 * null means "no filter — fetch all levels".
 */
export function levelsForMinimum(
  min: "debug" | "info" | "warning" | "error",
): readonly string[] | null {
  switch (min) {
    case "debug":
      return null;
    case "info":
      return ["info", "warning", "error", "critical"];
    case "warning":
      return ["warning", "error", "critical"];
    case "error":
      return ["error", "critical"];
  }
}
