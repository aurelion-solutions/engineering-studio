import * as vscode from "vscode";
import { ACCESS_ANALYSIS_CATEGORIES } from "./accessAnalysisCategories";

// ─── Node classes ─────────────────────────────────────────────────────────────

export class AccessAnalysisCategoryNode extends vscode.TreeItem {
  readonly kind = "category" as const;

  constructor(public readonly categoryKey: string, label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.accessAnalysis.category.${categoryKey}`;
    this.contextValue = "aurelion.accessAnalysisCategory";
    this.iconPath = new vscode.ThemeIcon("folder");
    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open access analysis list",
      arguments: [
        {
          kind: "accessAnalysis",
          ctxKey: categoryKey,
          categoryKey,
          label,
        },
      ],
    };
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class AccessAnalysisTreeDataProvider
  implements vscode.TreeDataProvider<AccessAnalysisCategoryNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    AccessAnalysisCategoryNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly categoryNodes: AccessAnalysisCategoryNode[];

  constructor() {
    this.categoryNodes = ACCESS_ANALYSIS_CATEGORIES.map(
      (cat) => new AccessAnalysisCategoryNode(cat.key, cat.label),
    );
  }

  getTreeItem(element: AccessAnalysisCategoryNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AccessAnalysisCategoryNode): vscode.ProviderResult<AccessAnalysisCategoryNode[]> {
    if (element === undefined) {
      return this.categoryNodes;
    }
    return [];
  }

  getCategoryNode(key: string): AccessAnalysisCategoryNode | undefined {
    return this.categoryNodes.find((n) => n.categoryKey === key);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
