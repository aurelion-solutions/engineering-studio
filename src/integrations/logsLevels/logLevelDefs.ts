/**
 * Pure level definitions for the Logs tree.
 * No `vscode` import — unit-testable via `node --test`.
 */

export type LogLevelDef = {
  key: "debug" | "info" | "warning" | "error";
  label: string;
  iconId: string;
  iconColor: string;
};

export function buildLogLevelDefs(): LogLevelDef[] {
  return [
    { key: "debug", label: "debug", iconId: "debug", iconColor: "charts.blue" },
    { key: "info", label: "info", iconId: "info", iconColor: "foreground" },
    { key: "warning", label: "warning", iconId: "warning", iconColor: "editorWarning.foreground" },
    { key: "error", label: "error", iconId: "error", iconColor: "errorForeground" },
  ];
}
