import * as vscode from "vscode";
import { buildLogLevelDefs, type LogLevelDef } from "./logLevelDefs";
export type { LogLevelDef } from "./logLevelDefs";

// ─── Node class ───────────────────────────────────────────────────────────────

export class LogLevelNode extends vscode.TreeItem {
  readonly kind = "logLevel" as const;

  constructor(def: LogLevelDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.logs.level.${def.key}`;
    this.contextValue = "aurelion.logLevel";
    this.iconPath = new vscode.ThemeIcon(
      def.iconId,
      new vscode.ThemeColor(def.iconColor),
    );
    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open logs panel",
      arguments: [
        {
          kind: "logs",
          ctxKey: def.key,
          minLevel: def.key,
        },
      ],
    };
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class LogsLevelsTreeDataProvider
  implements vscode.TreeDataProvider<LogLevelNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    LogLevelNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly levelNodes: LogLevelNode[];

  constructor() {
    this.levelNodes = buildLogLevelDefs().map((def) => new LogLevelNode(def));
  }

  getTreeItem(element: LogLevelNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LogLevelNode): vscode.ProviderResult<LogLevelNode[]> {
    if (element === undefined) {
      return this.levelNodes;
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
