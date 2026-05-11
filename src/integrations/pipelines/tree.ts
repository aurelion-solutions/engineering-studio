import * as vscode from "vscode";
import { buildPipelineStatusDefs, type PipelineStatusDef } from "./pipelineStatusDefs";
export type { PipelineStatusDef } from "./pipelineStatusDefs";

// ─── Node classes ─────────────────────────────────────────────────────────────

export class PipelineStatusNode extends vscode.TreeItem {
  readonly kind = "pipelineStatus" as const;
  readonly statusKey: string;

  constructor(def: PipelineStatusDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);
    this.statusKey = def.key;
    this.id = `aurelion.pipelines.status.${def.key}`;
    this.contextValue = "aurelion.pipelineStatus";
    this.iconPath = new vscode.ThemeIcon(def.iconId);
    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open pipeline runs",
      arguments: [{
        kind: "pipelineRuns",
        ctxKey: `pipeline-runs:${def.key}`,
        statusKey: def.key,
        label: def.label,
      }],
    };
  }
}

export class PipelineDefinitionsNode extends vscode.TreeItem {
  readonly kind = "pipelineDefinitions" as const;

  constructor(def: PipelineStatusDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.pipelines.definitions`;
    this.contextValue = "aurelion.pipelineDefinitions";
    this.iconPath = new vscode.ThemeIcon(def.iconId);
    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open pipeline definitions",
      arguments: [{ kind: "pipelineDefinitions", ctxKey: "pipeline-definitions" }],
    };
  }
}

/**
 * Visual divider between the leading Definitions entry and the status buckets.
 * VS Code TreeView has no native separator API, so this is a non-interactive
 * TreeItem with a horizontal-rule label, no icon, and no command.
 */
export class PipelineSeparatorNode extends vscode.TreeItem {
  readonly kind = "pipelineSeparator" as const;

  constructor() {
    super("┈┈┈┈┈", vscode.TreeItemCollapsibleState.None);
    this.id = "aurelion.pipelines.separator";
    this.contextValue = "aurelion.pipelineSeparator";
    this.tooltip = "";
  }
}

type PipelineNode = PipelineStatusNode | PipelineDefinitionsNode | PipelineSeparatorNode;

// ─── Provider ─────────────────────────────────────────────────────────────────

export class PipelinesTreeDataProvider
  implements vscode.TreeDataProvider<PipelineNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    PipelineNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly nodes: PipelineNode[];

  constructor() {
    const built: PipelineNode[] = [];
    for (const def of buildPipelineStatusDefs()) {
      if (def.key === "definitions") {
        built.push(new PipelineDefinitionsNode(def));
        built.push(new PipelineSeparatorNode());
      } else {
        built.push(new PipelineStatusNode(def));
      }
    }
    this.nodes = built;
  }

  getTreeItem(element: PipelineNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PipelineNode): vscode.ProviderResult<PipelineNode[]> {
    if (element === undefined) {
      return this.nodes;
    }
    return [];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
