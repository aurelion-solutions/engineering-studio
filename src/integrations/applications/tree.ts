import * as vscode from "vscode";
import { fetchApplications, fetchMatchingConnectorInstances } from "../../api/platformClient";
import { applicationsToNodes } from "./applicationsMapper";
import { connectorInstancesToNodes } from "./connectorInstancesMapper";
import { connectorIconColor } from "./connectorIcon";
import { formatIntegrationWhen } from "./format";
import { computeConnectorSummary, type ConnectorSummary } from "../statusBar/summary";
import { shouldStartReconnect, shouldStopReconnect } from "./applicationsTreeReconnect";

// ─── Node classes ────────────────────────────────────────────────────────────

export class AppNode extends vscode.TreeItem {
  readonly kind = "app" as const;
  readonly appId: string;

  constructor(public readonly nodeId: string, label: string) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = nodeId;
    this.appId = nodeId;
    this.contextValue = "aurelion.application";
    this.command = {
      command: "aurelion.openLogs",
      title: "Show logs",
      arguments: [{ appId: this.appId, appName: String(label) }],
    };
  }
}

export class ConnectorNode extends vscode.TreeItem {
  readonly kind = "connector" as const;
  readonly appId: string;
  readonly instanceRowId: string;
  readonly instanceId: string;
  readonly isOnline: boolean;

  constructor(
    appId: string,
    vm: {
      id: string;
      instanceId: string;
      instanceRowId: string;
      label: string;
      isOnline: boolean;
      lastSeenAt: string;
      tags: string[];
    },
  ) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = vm.id;
    this.appId = appId;
    this.instanceRowId = vm.instanceRowId;
    this.instanceId = vm.instanceId;
    this.isOnline = vm.isOnline;
    this.description = formatIntegrationWhen(vm.lastSeenAt);
    this.iconPath = new vscode.ThemeIcon(
      "circle-filled",
      new vscode.ThemeColor(connectorIconColor({ is_online: vm.isOnline })),
    );
    const tagList = vm.tags.length > 0 ? vm.tags.join(", ") : "_none_";
    const tooltip = new vscode.MarkdownString(
      `\`\`\`\n${vm.instanceId}\n\`\`\`\n\n**Tags:** ${tagList}\n\n**Last seen:** ${vm.lastSeenAt}`,
    );
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.connectorInstance";
  }
}

export class EmptyChildNode extends vscode.TreeItem {
  readonly kind = "empty" as const;

  constructor() {
    super("(no connector instances)", vscode.TreeItemCollapsibleState.None);
  }
}

export class LoadingNode extends vscode.TreeItem {
  readonly kind = "loading" as const;

  constructor() {
    super("Loading…", vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("loading~spin");
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Node = AppNode | ConnectorNode | EmptyChildNode | LoadingNode;

type ChildCacheEntry =
  | { state: "loading" }
  | { state: "loaded"; nodes: ConnectorNode[]; empty: boolean }
  | { state: "failed"; error: unknown };

// ─── Provider ────────────────────────────────────────────────────────────────

export class ApplicationsTreeDataProvider
  implements vscode.TreeDataProvider<Node>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    Node | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // Step 1 state
  private appNodes: AppNode[] = [];
  private isRefreshing = false;

  // Step 2 state
  private childrenCache = new Map<string, ChildCacheEntry>();
  private inFlightAppIds = new Set<string>();
  private consecutiveFailures = 0;
  private lastSuccessAt: Date | null = null;
  private treeView: vscode.TreeView<Node> | undefined;

  // Step 4 state
  private readonly _onDidChangeState = new vscode.EventEmitter<void>();
  readonly onDidChangeState: vscode.Event<void> = this._onDidChangeState.event;
  private _lastRefreshFailed = false;
  private autoRefreshTimer: ReturnType<typeof setInterval> | undefined;
  private autoRefreshIntervalMs = 0;

  // Step 7 — reconnect poller; independent of autoRefreshTimer (steady-state).
  // Started on 0 → 1 failure transition, cleared on first success and in dispose().
  private reconnectTimer: ReturnType<typeof setInterval> | undefined;

  // NOT owned — do not dispose; lifecycle is managed by extension.ts via context.subscriptions
  private readonly extensionChannel: vscode.LogOutputChannel;

  constructor(extensionChannel: vscode.LogOutputChannel) {
    this.extensionChannel = extensionChannel;
  }

  setTreeView(view: vscode.TreeView<Node>): void {
    this.treeView = view;
  }

  get lastRefreshFailed(): boolean {
    return this._lastRefreshFailed;
  }

  /**
   * Returns an aggregated connector summary across all app nodes whose children
   * have been loaded (childrenCache state === 'loaded').
   *
   * Apps with cache state 'loading' or 'failed', or not yet expanded, contribute
   * `instances: undefined` and are excluded from the count per the UX invariant
   * documented in summary.ts.
   */
  getConnectorSummary(): ConnectorSummary {
    const inputs = this.appNodes.map((appNode) => {
      const entry = this.childrenCache.get(appNode.appId);
      if (entry?.state === "loaded") {
        return {
          instances: entry.nodes.map((n) => ({ is_online: n.isOnline })),
        };
      }
      return { instances: undefined };
    });
    return computeConnectorSummary(inputs);
  }

  /**
   * Sets the auto-refresh interval in milliseconds.
   *
   * - `ms === 0` (or non-finite / negative): disables auto-refresh.
   * - `ms > 0`: starts a `setInterval` that calls `refresh()`.
   *   Effective minimum is 5000ms (enforced by Math.max).
   * - No-op when the normalized value equals the current interval (E8).
   *
   * The existing reentrancy guard in `refresh()` ensures that concurrent ticks
   * are safe — a tick fired while a refresh is in progress is a silent no-op.
   */
  setAutoRefreshIntervalMs(ms: number): void {
    const raw = Number.isFinite(ms) ? ms : 0;
    const normalized = raw <= 0 ? 0 : Math.max(5000, Math.floor(raw));

    // E8: no-op when value hasn't changed (also handles initial activate with 0)
    if (normalized === this.autoRefreshIntervalMs) {
      return;
    }

    if (this.autoRefreshTimer !== undefined) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = undefined;
    }

    this.autoRefreshIntervalMs = normalized;

    if (normalized === 0) {
      return; // auto-refresh disabled
    }

    this.autoRefreshTimer = setInterval(() => {
      void this.refresh();
    }, normalized);
  }

  /**
   * Returns an immutable snapshot of current app nodes for use in quick pick menus (G10).
   * Creates a new array via .map() so callers cannot mutate internal state.
   */
  getAppNodesForQuickPick(): Array<{ id: string; name: string }> {
    return this.appNodes.map((n) => ({ id: n.appId, name: String(n.label) }));
  }

  /**
   * Returns the live AppNode instance for the given appId, or undefined if not found.
   * Used by focusApplication (palette branch) to obtain the actual tree-node instance
   * required by TreeView.reveal — a DTO alone is not sufficient (B-1).
   */
  getAppNodeById(id: string): AppNode | undefined {
    return this.appNodes.find((n) => n.appId === id);
  }

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Node): vscode.ProviderResult<Node[]> {
    if (element === undefined) {
      return this.appNodes;
    }

    if (element.kind === "app") {
      const entry = this.childrenCache.get(element.appId);

      if (entry === undefined) {
        // First expand: start lazy fetch and return a loading placeholder
        void this.loadChildren(element);
        return [new LoadingNode()];
      }

      if (entry.state === "loading") {
        return [new LoadingNode()];
      }

      if (entry.state === "loaded") {
        if (entry.empty) {
          return [new EmptyChildNode()];
        }
        return entry.nodes;
      }

      // state === "failed": app node already shows "(refresh failed)" description
      return [];
    }

    // connector or empty nodes have no children
    return [];
  }

  /**
   * Core fetch logic shared between lazy-load (getChildren) and refreshApplication.
   * When calledFromRefresh=true, clears description on success / sets it on failure.
   */
  private async loadChildren(
    appNode: AppNode,
    calledFromRefresh = false,
  ): Promise<void> {
    const appId = appNode.appId;

    if (this.inFlightAppIds.has(appId)) {
      return;
    }

    this.inFlightAppIds.add(appId);
    this.childrenCache.set(appId, { state: "loading" });
    this._onDidChangeTreeData.fire(appNode);

    try {
      const raw = await fetchMatchingConnectorInstances(appId, { onlineOnly: false });

      // Stale-appId check: full refresh may have replaced this.appNodes while fetch was in flight
      const currentAppNode = this.appNodes.find((n) => n.appId === appId);
      if (!currentAppNode) {
        return;
      }

      const vms = connectorInstancesToNodes(appId, raw);
      const nodes = vms.map((vm) => new ConnectorNode(appId, vm));
      this.childrenCache.set(appId, {
        state: "loaded",
        nodes,
        empty: nodes.length === 0,
      });

      if (calledFromRefresh) {
        currentAppNode.description = undefined;
      }

      this.recomputeBadge();
      this._onDidChangeTreeData.fire(currentAppNode);
    } catch (e) {
      // Stale-check on failure path too
      const currentAppNode = this.appNodes.find((n) => n.appId === appId);
      if (!currentAppNode) {
        return;
      }

      this.childrenCache.set(appId, { state: "failed", error: e });

      if (calledFromRefresh) {
        currentAppNode.description = "(refresh failed)";
      }

      // Per-app failure: do NOT touch treeView.message or show toast
      this._onDidChangeTreeData.fire(currentAppNode);
    } finally {
      this.inFlightAppIds.delete(appId);
    }
  }

  async refreshApplication(appId: string): Promise<void> {
    if (this.inFlightAppIds.has(appId)) {
      return;
    }

    const appNode = this.appNodes.find((n) => n.appId === appId);
    if (!appNode) {
      return;
    }

    // Reset cache entry so loadChildren starts fresh
    this.childrenCache.delete(appId);

    // C-2: wrap in try/finally so _onDidChangeState fires even if loadChildren
    // unexpectedly throws (loadChildren is non-throwing by contract, but the
    // finally guard is cheap insurance against future regressions).
    try {
      await this.loadChildren(appNode, true);
    } finally {
      this._onDidChangeState.fire();
    }
  }

  async refresh(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }
    this.isRefreshing = true;
    let showRetryToast = false;

    try {
      const raw = await fetchApplications();
      this.appNodes = applicationsToNodes(raw).map(
        (vm) => new AppNode(vm.id, vm.label),
      );
      this.childrenCache.clear();
      this.consecutiveFailures = 0;

      if (shouldStopReconnect(this.consecutiveFailures, this.reconnectTimer !== undefined)) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = undefined;
      }

      this.lastSuccessAt = new Date();
      this._lastRefreshFailed = false;

      if (this.treeView) {
        this.treeView.message = undefined;
      }

      this.recomputeBadge();
      this._onDidChangeTreeData.fire();
    } catch (e) {
      this.extensionChannel.error("Applications refresh failed", String(e));
      this.appNodes = [];
      this.childrenCache.clear();
      this._lastRefreshFailed = true;

      const wasZero = this.consecutiveFailures === 0;
      this.consecutiveFailures += 1;

      if (shouldStartReconnect(wasZero, this.reconnectTimer !== undefined)) {
        this.reconnectTimer = setInterval(() => {
          void this.refresh();
        }, 2000);
      }

      if (this.treeView) {
        const stamp = this.lastSuccessAt
          ? this.lastSuccessAt.toLocaleTimeString(undefined, { hour12: false })
          : "never";
        this.treeView.message = `Kernel unreachable — last successful refresh: ${stamp}`;
      }

      this.recomputeBadge();
      this._onDidChangeTreeData.fire();

      showRetryToast = wasZero; // show only on 0 → 1 transition
    } finally {
      // C-1: emit _onDidChangeState exactly once per refresh(), always in finally,
      // after isRefreshing is released so observers see a consistent state.
      this.isRefreshing = false; // release guard BEFORE showing toast so Retry isn't a no-op
      this._onDidChangeState.fire();
    }

    if (showRetryToast) {
      const pick = await vscode.window.showErrorMessage(
        "Kernel unreachable",
        "Retry",
      );
      if (pick === "Retry") {
        await vscode.commands.executeCommand("aurelion.refreshApplications");
      }
    }
  }

  private recomputeBadge(): void {
    if (!this.treeView) {
      return;
    }

    let offlineCount = 0;
    let hasAnyLoaded = false;

    for (const entry of this.childrenCache.values()) {
      if (entry.state === "loaded") {
        hasAnyLoaded = true;
        for (const node of entry.nodes) {
          if (!node.isOnline) {
            offlineCount += 1;
          }
        }
      }
    }

    if (!hasAnyLoaded || offlineCount === 0) {
      this.treeView.badge = undefined;
      return;
    }

    this.treeView.badge = {
      value: offlineCount,
      tooltip: `${offlineCount} connector instance${offlineCount === 1 ? "" : "s"} offline`,
    };
  }

  dispose(): void {
    if (this.autoRefreshTimer !== undefined) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = undefined;
    }

    if (this.reconnectTimer !== undefined) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this._onDidChangeState.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
