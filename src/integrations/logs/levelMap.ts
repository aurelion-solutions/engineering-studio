/**
 * Pure level mapper — no vscode dependency.
 * Maps raw log level strings to uppercase prefix literals.
 */

export type LevelPrefix = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_MAP: Record<string, LevelPrefix> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO",
  information: "INFO",
  warn: "WARN",
  warning: "WARN",
  error: "ERROR",
  err: "ERROR",
  fatal: "ERROR",
  critical: "ERROR",
};

/**
 * Returns the canonical uppercase level prefix for a raw level string.
 * Case-insensitive, trims whitespace. Falls back to "INFO" for unknown/empty/null/undefined values.
 */
export function levelPrefixFor(raw: string | null | undefined): LevelPrefix {
  if (raw == null || raw === "") {
    return "INFO";
  }
  const normalized = raw.trim().toLowerCase();
  return LEVEL_MAP[normalized] ?? "INFO";
}
