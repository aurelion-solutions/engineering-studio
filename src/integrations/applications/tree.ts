import * as vscode from "vscode";
import { fetchApplications } from "../../api/platformClient";
import { applicationsToNodes } from "./applicationsMapper";
import { shouldStartReconnect, shouldStopReconnect } from "./applicationsTreeReconnect";

// ─── Node classes ────────────────────────────────────────────────────────────

export class AppNode extends vscode.TreeItem {
  readonly kind = "app" as const;
  readonly appId: string;
  readonly appName: string;

  constructor(public readonly nodeId: string, label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.id = nodeId;
    this.appId = nodeId;
    this.appName = label;
    this.contextValue = "aurelion.application";
    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open application details",
      arguments: [
        {
          kind: "application",
          ctxKey: this.appId,
          appId: this.appId,
          appName: label,
        },
      ],
    };
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Node = AppNode;

// ─── Provider ────────────────────────────────────────────────────────────────

export class ApplicationsTreeDataProvider
  implements vscode.TreeDataProvider<Node>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    Node | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private appNodes: AppNode[] = [];
  private isRefreshing = false;
  private consecutiveFailures = 0;
  private lastSuccessAt: Date | null = null;
  private treeView: vscode.TreeView<Node> | undefined;

  private readonly _onDidChangeState = new vscode.EventEmitter<void>();
  readonly onDidChangeState: vscode.Event<void> = this._onDidChangeState.event;
  private _lastRefreshFailed = false;
  private autoRefreshTimer: ReturnType<typeof setInterval> | undefined;
  private autoRefreshIntervalMs = 0;

  // Step 7 — reconnect poller
  private reconnectTimer: ReturnType<typeof setInterval> | undefined;

  // NOT owned — do not dispose
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
   * Returns the number of currently loaded app nodes.
   */
  getAppCount(): number {
    return this.appNodes.length;
  }

  /**
   * Sets the auto-refresh interval in milliseconds.
   */
  setAutoRefreshIntervalMs(ms: number): void {
    const raw = Number.isFinite(ms) ? ms : 0;
    const normalized = raw <= 0 ? 0 : Math.max(5000, Math.floor(raw));

    if (normalized === this.autoRefreshIntervalMs) {
      return;
    }

    if (this.autoRefreshTimer !== undefined) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = undefined;
    }

    this.autoRefreshIntervalMs = normalized;

    if (normalized === 0) {
      return;
    }

    this.autoRefreshTimer = setInterval(() => {
      void this.refresh();
    }, normalized);
  }

  /**
   * Returns an immutable snapshot of current app nodes for use in quick pick menus.
   */
  getAppNodesForQuickPick(): Array<{ id: string; name: string }> {
    return this.appNodes.map((n) => ({ id: n.appId, name: String(n.label) }));
  }

  /**
   * Returns the live AppNode instance for the given appId, or undefined if not found.
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
    return [];
  }

  async refreshApplication(appId: string): Promise<void> {
    // After refactor: refreshing a single app re-triggers the detail panel refresh
    // via the openDetailPanel command. The tree itself just fires state change.
    const appNode = this.appNodes.find((n) => n.appId === appId);
    if (!appNode) {
      return;
    }
    try {
      await vscode.commands.executeCommand("aurelion.openDetailPanel", {
        kind: "application",
        ctxKey: appId,
        appId,
        appName: appNode.appName,
      });
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

      this._onDidChangeTreeData.fire();
    } catch (e) {
      this.extensionChannel.error("Applications refresh failed", String(e));
      this.appNodes = [];
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

      this._onDidChangeTreeData.fire();

      showRetryToast = wasZero;
    } finally {
      this.isRefreshing = false;
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
