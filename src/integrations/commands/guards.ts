// Pure type-guards for command handlers.
// No `vscode` import — unit-testable via `node --test`.

export interface ConnectorNodeLike {
  readonly kind: "connector";
  readonly appId: string;
  readonly instanceId: string;
}

export interface AppNodeLike {
  readonly kind: "app";
  readonly appId: string;
}

/**
 * Returns true when `v` is a connector-node shaped object with a non-empty
 * `instanceId`. Uses `kind === 'connector'` as the discriminant.
 */
export function isConnectorNode(v: unknown): v is ConnectorNodeLike {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    r["kind"] === "connector" &&
    typeof r["appId"] === "string" &&
    r["appId"].length > 0 &&
    typeof r["instanceId"] === "string" &&
    r["instanceId"].length > 0
  );
}

/**
 * Returns true when `v` is an app-node shaped object with a non-empty `appId`.
 * Uses `kind === 'app'` as the discriminant.
 */
export function isAppNode(v: unknown): v is AppNodeLike {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    r["kind"] === "app" &&
    typeof r["appId"] === "string" &&
    r["appId"].length > 0
  );
}

export interface OpenLogsArg {
  readonly appId: string;
  readonly appName: string;
}

// ─── openDetailPanel guard ────────────────────────────────────────────────────

import type { PanelOpenArgs } from "../../panels/types";

/**
 * Type-guard for the `aurelion.openDetailPanel` command argument.
 */
export function isOpenDetailPanelArg(v: unknown): v is PanelOpenArgs {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  if (typeof r["kind"] !== "string") {
    return false;
  }
  if (typeof r["ctxKey"] !== "string" || (r["ctxKey"] as string).length === 0) {
    return false;
  }
  switch (r["kind"]) {
    case "application":
      return typeof r["appId"] === "string" && typeof r["appName"] === "string";
    case "inventory":
    case "accessAnalysis":
      return typeof r["categoryKey"] === "string" && typeof r["label"] === "string";
    case "events":
      return (
        r["domain"] === "inventory" ||
        r["domain"] === "capabilities" ||
        r["domain"] === "platform"
      );
    case "logs":
      return ["debug", "info", "warning", "error"].includes(String(r["minLevel"]));
    case "llmModel":
      return typeof r["modelId"] === "string" && typeof r["label"] === "string";
    case "llmModelsList":
      return true;
    default:
      return false;
  }
}

/**
 * Returns true when `v` carries the { appId, appName } payload
 * passed by AppNode.command arguments for aurelion.openLogs.
 */
export function isOpenLogsArg(v: unknown): v is OpenLogsArg {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    typeof r["appId"] === "string" &&
    r["appId"].length > 0 &&
    typeof r["appName"] === "string"
  );
}
