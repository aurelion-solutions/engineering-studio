import * as vscode from "vscode";
import { buildEventsDomainDefs, type EventDomainDef } from "./eventsDefs";
export type { EventDomainDef } from "./eventsDefs";

// ─── Node class ───────────────────────────────────────────────────────────────

export class DomainNode extends vscode.TreeItem {
  readonly kind = "eventDomain" as const;

  constructor(def: EventDomainDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.events.domain.${def.key}`;
    this.contextValue = "aurelion.eventDomain";
    this.iconPath = new vscode.ThemeIcon(def.iconId);
    this.command = {
      command: "aurelion.openDetailPanel",
      title: "Open events panel",
      arguments: [
        {
          kind: "events",
          ctxKey: def.key,
          domain: def.key,
        },
      ],
    };
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class EventsTreeDataProvider
  implements vscode.TreeDataProvider<DomainNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    DomainNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly domainNodes: DomainNode[];

  constructor() {
    this.domainNodes = buildEventsDomainDefs().map((def) => new DomainNode(def));
  }

  getTreeItem(element: DomainNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DomainNode): vscode.ProviderResult<DomainNode[]> {
    if (element === undefined) {
      return this.domainNodes;
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
