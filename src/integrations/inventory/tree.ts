import * as vscode from "vscode";
import { INVENTORY_CATEGORIES } from "./inventoryCategories";

// ─── Node classes ─────────────────────────────────────────────────────────────

export class CategoryNode extends vscode.TreeItem {
  readonly kind = "category" as const;

  constructor(public readonly categoryKey: string, label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.category.${categoryKey}`;
    this.contextValue = "aurelion.inventoryCategory";
    this.iconPath = new vscode.ThemeIcon("folder");
    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open inventory list",
      arguments: [
        {
          kind: "inventory",
          ctxKey: categoryKey,
          categoryKey,
          label,
        },
      ],
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
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
