import * as vscode from "vscode";
import type { LakeBatchListResponseFromApi, LakeStatusFromApi } from "../../api/types";
import {
  buildLakeBatchNodes,
  buildLakeErrorNode,
  buildLakeTableNodes,
} from "./lakeNodes";
import type { LakeNodeData } from "./lakeNodes";

// ─── Node classes ─────────────────────────────────────────────────────────────

export class LakeTableNode extends vscode.TreeItem {
  readonly kind = "lakeTable" as const;

  constructor(data: Extract<LakeNodeData, { kind: "lakeTable" }>) {
    super(data.label, vscode.TreeItemCollapsibleState.None);
    this.description = data.description;
    this.tooltip = data.tooltip;
    this.iconPath = new vscode.ThemeIcon("database");
    this.contextValue = "aurelion.lakeTable";
  }
}

export class LakePlaceholderNode extends vscode.TreeItem {
  readonly kind = "lakePlaceholder" as const;

  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("info");
    this.contextValue = "aurelion.lakePlaceholder";
  }
}

export class LakeErrorNode extends vscode.TreeItem {
  readonly kind = "lakeError" as const;

  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("error");
    this.contextValue = "aurelion.lakeError";
  }
}

export class LakeBatchNode extends vscode.TreeItem {
  readonly kind = "lakeBatch" as const;

  constructor(data: Extract<LakeNodeData, { kind: "lakeBatch" }>) {
    super(data.label, vscode.TreeItemCollapsibleState.None);
    this.description = data.description;
    this.tooltip = data.tooltip;
    this.iconPath = new vscode.ThemeIcon("history");
    this.contextValue = "aurelion.lakeBatch";
  }
}

export class LakeSectionHeaderNode extends vscode.TreeItem {
  readonly kind = "lakeSectionHeader" as const;

  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("list-tree");
    this.contextValue = "aurelion.lakeSectionHeader";
  }
}

export type LakeNode =
  | LakeTableNode
  | LakePlaceholderNode
  | LakeErrorNode
  | LakeBatchNode
  | LakeSectionHeaderNode;

// ─── Provider ─────────────────────────────────────────────────────────────────

export class LakeViewProvider
  implements vscode.TreeDataProvider<LakeNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    LakeNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private nodes: LakeNode[] = [];
  private isRefreshing = false;

  private readonly fetchStatus: () => Promise<LakeStatusFromApi>;
  private readonly fetchBatches: () => Promise<LakeBatchListResponseFromApi>;

  constructor(
    fetchStatus: () => Promise<LakeStatusFromApi>,
    fetchBatches: () => Promise<LakeBatchListResponseFromApi>,
  ) {
    this.fetchStatus = fetchStatus;
    this.fetchBatches = fetchBatches;
  }

  getTreeItem(element: LakeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LakeNode): vscode.ProviderResult<LakeNode[]> {
    if (element !== undefined) {
      return [];
    }
    return this.nodes;
  }

  refresh(): void {
    if (this.isRefreshing) {
      return;
    }
    this.isRefreshing = true;

    const tablesFetch = this.fetchStatus();
    const batchesFetch = this.fetchBatches();

    void Promise.allSettled([tablesFetch, batchesFetch])
      .then(([tablesResult, batchesResult]) => {
        const tableNodes: LakeNode[] = [];
        const batchNodes: LakeNode[] = [];

        // Tables section
        if (tablesResult.status === "fulfilled") {
          const data = buildLakeTableNodes(tablesResult.value);
          for (const d of data) {
            tableNodes.push(this._toNode(d));
          }
        } else {
          const message =
            tablesResult.reason instanceof Error
              ? tablesResult.reason.message
              : String(tablesResult.reason);
          const errData = buildLakeErrorNode(message);
          tableNodes.push(new LakeErrorNode(errData.label));
        }

        // Batches section
        const batchesResponse =
          batchesResult.status === "fulfilled" ? batchesResult.value : null;
        const batchesError =
          batchesResult.status === "rejected" ? batchesResult.reason : null;

        if (batchesResponse !== null) {
          const data = buildLakeBatchNodes(batchesResponse.items);
          for (const d of data) {
            batchNodes.push(this._toNode(d));
          }
        } else {
          // Section header still present even on error
          batchNodes.push(new LakeSectionHeaderNode("Recent batches"));
          const message =
            batchesError instanceof Error
              ? batchesError.message
              : String(batchesError);
          const errData = buildLakeErrorNode(message);
          batchNodes.push(new LakeErrorNode(errData.label));
        }

        this.nodes = [...tableNodes, ...batchNodes];
        this._onDidChangeTreeData.fire();
      })
      .finally(() => {
        this.isRefreshing = false;
      });
  }

  private _toNode(d: LakeNodeData): LakeNode {
    switch (d.kind) {
      case "lakeTable":
        return new LakeTableNode(d);
      case "lakePlaceholder":
        return new LakePlaceholderNode(d.label);
      case "lakeError":
        return new LakeErrorNode(d.label);
      case "lakeBatch":
        return new LakeBatchNode(d);
      case "lakeSectionHeader":
        return new LakeSectionHeaderNode(d.label);
    }
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
