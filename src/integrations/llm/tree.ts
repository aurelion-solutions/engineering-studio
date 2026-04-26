import * as vscode from "vscode";

// ─── Node classes ─────────────────────────────────────────────────────────────

export class LlmModelsEntryNode extends vscode.TreeItem {
  readonly kind = "llmModelsEntry" as const;

  constructor() {
    super("Models", vscode.TreeItemCollapsibleState.None);
    this.id = "aurelion.llm.models";
    this.contextValue = "aurelion.llmModelsEntry";
    this.iconPath = new vscode.ThemeIcon("list-tree");
    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open LLM models list",
      arguments: [{ kind: "llmModelsList", ctxKey: "llmModelsList" }],
    };
  }
}

export class LlmInferenceEntryNode extends vscode.TreeItem {
  readonly kind = "llmInferenceEntry" as const;

  constructor() {
    super("Inference", vscode.TreeItemCollapsibleState.None);
    this.id = "aurelion.llm.inference";
    this.contextValue = "aurelion.llmInferenceEntry";
    this.iconPath = new vscode.ThemeIcon("zap");
    this.command = {
      command: "aurelion.openInferencePanel",
      title: "Open inference panel",
    };
  }
}

export type LlmNode = LlmModelsEntryNode | LlmInferenceEntryNode;

// ─── Provider ─────────────────────────────────────────────────────────────────

export class LlmTreeDataProvider
  implements vscode.TreeDataProvider<LlmNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    LlmNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: LlmNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LlmNode): vscode.ProviderResult<LlmNode[]> {
    if (element !== undefined) return [];
    return [new LlmModelsEntryNode(), new LlmInferenceEntryNode()];
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
