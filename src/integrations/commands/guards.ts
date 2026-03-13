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

export interface RefreshInventoryCategoryArg {
  readonly categoryKey: string;
}

/**
 * Returns true when `v` is a plain `{ categoryKey }` object emitted by
 * `FailedCategoryChildNode.command.arguments` — not a `CategoryNode` instance.
 */
export function isRefreshInventoryCategoryArg(
  v: unknown,
): v is RefreshInventoryCategoryArg {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    typeof r["categoryKey"] === "string" &&
    r["categoryKey"].length > 0 &&
    !("kind" in r)
  );
}

export interface OpenLogsArg {
  readonly appId: string;
  readonly appName: string;
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
