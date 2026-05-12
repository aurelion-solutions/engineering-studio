import * as vscode from "vscode";
import { INVENTORY_CATEGORIES } from "./inventoryCategories";
import { fetchAccessStateDiffCount, fetchAccountStateDiffCount } from "../../api/platformClient";

// ─── Node classes ─────────────────────────────────────────────────────────────

export class CategoryNode extends vscode.TreeItem {
  readonly kind = "category" as const;

  constructor(public readonly categoryKey: string, label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.category.${categoryKey}`;
    this.contextValue = "aurelion.inventoryCategory";
    this.iconPath = new vscode.ThemeIcon("folder");

    // Multi-tab categories use their own panel kind with tab support
    const openArgs = categoryKey === "accessState"
      ? { kind: "accessState", ctxKey: "access-state", activeTab: "list" }
      : categoryKey === "accountState"
      ? { kind: "accountState", ctxKey: "account-state", activeTab: "list" }
      : { kind: "inventory", ctxKey: categoryKey, categoryKey, label };

    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open inventory list",
      arguments: [openArgs],
    };
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class InventoryTreeDataProvider
  implements vscode.TreeDataProvider<CategoryNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    CategoryNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly categoryNodes: CategoryNode[];

  constructor() {
    this.categoryNodes = INVENTORY_CATEGORIES.map(
      (cat) => new CategoryNode(cat.key, cat.label),
    );
    // Async badge loads — do not block tree render
    void this._loadAccessStateBadge();
    void this._loadAccountStateBadge();
  }

  getTreeItem(element: CategoryNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CategoryNode): vscode.ProviderResult<CategoryNode[]> {
    if (element === undefined) {
      return this.categoryNodes;
    }
    return [];
  }

  getCategoryNode(key: string): CategoryNode | undefined {
    return this.categoryNodes.find((n) => n.categoryKey === key);
  }

  refresh(): void {
    // Re-fetch badges on explicit refresh, then fire tree change
    void Promise.all([
      this._loadAccessStateBadge(),
      this._loadAccountStateBadge(),
    ]).then(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async _loadAccessStateBadge(): Promise<void> {
    const node = this.categoryNodes.find((n) => n.categoryKey === "accessState");
    if (!node) { return; }
    try {
      const counts = await fetchAccessStateDiffCount();
      node.description = counts.total > 0 ? `${counts.total} diff` : undefined;
    } catch {
      // best-effort — no crash on failure
      node.description = undefined;
    }
    this._onDidChangeTreeData.fire(node);
  }

  private async _loadAccountStateBadge(): Promise<void> {
    const node = this.categoryNodes.find((n) => n.categoryKey === "accountState");
    if (!node) { return; }
    try {
      const counts = await fetchAccountStateDiffCount();
      node.description = counts.total > 0 ? `${counts.total} diff` : undefined;
    } catch {
      // best-effort — no crash on failure
      node.description = undefined;
    }
    this._onDidChangeTreeData.fire(node);
  }
}
