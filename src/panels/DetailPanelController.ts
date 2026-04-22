import * as vscode from "vscode";
import { renderPanelHtml } from "./panelHtml";
import type { PanelOpenArgs, PanelRow } from "./types";
import type { ApplicationFromApi } from "../api/types";
import type { EditConfig, Section } from "./types";
import {
  fetchApplications,
  fetchMatchingConnectorInstances,
  fetchPlatformEvents,
  fetchPlatformLogs,
  updateApplication,
  fetchCustomers,
  fetchSubjects,
  fetchAccounts,
  fetchResources,
  fetchAccessArtifacts,
  fetchAccessFacts,
  fetchArtifactBindings,
  fetchInitiatives,
  fetchOwnershipAssignments,
  fetchAccessUsageFacts,
  fetchThreatFacts,
  fetchPersons,
  fetchEmployees,
  fetchNHIs,
  fetchEmployeeRecords,
} from "../api/platformClient";
import { INVENTORY_CATEGORIES } from "../integrations/inventory/inventoryCategories";
import type { InventoryCategoryFetcherName } from "../integrations/inventory/inventoryCategories";

type InventoryFetcher = () => Promise<unknown[]>;

const INVENTORY_FETCHERS: Record<InventoryCategoryFetcherName, InventoryFetcher> = {
  fetchCustomers: () => fetchCustomers(),
  fetchSubjects: () => fetchSubjects(),
  fetchAccounts: () => fetchAccounts(),
  fetchResources: () => fetchResources(),
  fetchAccessArtifacts: () => fetchAccessArtifacts(),
  fetchAccessFacts: () => fetchAccessFacts(),
  fetchArtifactBindings: () => fetchArtifactBindings(),
  fetchInitiatives: () => fetchInitiatives(),
  fetchOwnershipAssignments: () => fetchOwnershipAssignments(),
  fetchAccessUsageFacts: () => fetchAccessUsageFacts(),
  fetchThreatFacts: () => fetchThreatFacts(),
  fetchPersons: () => fetchPersons(),
  fetchEmployees: () => fetchEmployees(),
  fetchNHIs: () => fetchNHIs(),
  fetchEmployeeRecords: () => fetchEmployeeRecords(),
};
import { buildApplicationRows, applicationColumns, buildConnectorSection, buildEditConfig } from "./renderers/applicationRenderer";
import { buildInventoryRows, inventoryColumns } from "./renderers/inventoryListRenderer";
import { buildEventsRows, eventsColumns } from "./renderers/eventsListRenderer";
import { buildLogsRows, logsColumns } from "./renderers/logsListRenderer";
import { levelsForMinimum } from "../integrations/logs/levelFilter";

export type { PanelOpenArgs };

export interface DetailPanelControllerOptions {
  readonly extensionChannel: vscode.LogOutputChannel;
  readonly refreshSecondsProvider: () => number;
}

type PanelEntry = {
  panel: vscode.WebviewPanel;
  timer: ReturnType<typeof setInterval> | undefined;
  insertionOrder: number;
  messageDisposable?: vscode.Disposable;
};

const MAX_PANELS = 8;

export class DetailPanelController implements vscode.Disposable {
  private readonly panels = new Map<string, PanelEntry>();
  private insertionCounter = 0;
  private readonly extensionChannel: vscode.LogOutputChannel;
  private readonly refreshSecondsProvider: () => number;

  constructor(options: DetailPanelControllerOptions) {
    this.extensionChannel = options.extensionChannel;
    this.refreshSecondsProvider = options.refreshSecondsProvider;
  }

  openOrReveal(args: PanelOpenArgs): void {
    const key = `${args.kind}:${args.ctxKey}`;
    const existing = this.panels.get(key);

    if (existing) {
      existing.panel.reveal(existing.panel.viewColumn ?? vscode.ViewColumn.Beside);
      void this._refresh(key, args);
      return;
    }

    // Enforce cap
    if (this.panels.size >= MAX_PANELS) {
      this._disposeOldest();
    }

    const panel = vscode.window.createWebviewPanel(
      "aurelionDetail",
      this._titleForArgs(args),
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    const nonce = this._nonce();
    panel.webview.html = renderPanelHtml(nonce, panel.webview.cspSource);

    const entry: PanelEntry = {
      panel,
      timer: undefined,
      insertionOrder: this.insertionCounter++,
    };

    this.panels.set(key, entry);

    entry.messageDisposable = panel.webview.onDidReceiveMessage(async (msg: { type: string; appId?: string; payload?: Record<string, unknown> }) => {
      if (msg.type === "patch" && msg.appId && msg.payload) {
        try {
          await updateApplication(msg.appId, msg.payload);
          void this._refresh(key, args);
        } catch (err) {
          this.extensionChannel.error(`DetailPanelController: patch error for ${key}`, String(err));
          void entry.panel.webview.postMessage({ type: "error", message: String(err) });
        }
      }
    });

    panel.onDidDispose(() => {
      this._cleanup(key);
    });

    // Start auto-refresh if needed
    const refreshSecs = this._refreshSecsForArgs(args);
    if (refreshSecs !== null) {
      entry.timer = setInterval(() => {
        void this._refresh(key, args);
      }, refreshSecs * 1000);
    }

    // Initial load
    void this._refresh(key, args);
  }

  async refresh(key: string): Promise<void> {
    const entry = this.panels.get(key);
    if (!entry) {
      return;
    }
    await this._refreshByEntry(key, entry);
  }

  refreshAll(): void {
    for (const key of this.panels.keys()) {
      const entry = this.panels.get(key);
      if (entry) {
        void this._refreshByEntry(key, entry);
      }
    }
  }

  restartAllTimers(): void {
    for (const [key, entry] of this.panels.entries()) {
      if (entry.timer !== undefined) {
        clearInterval(entry.timer);
        entry.timer = undefined;
      }
      const args = this._argsCache.get(key);
      if (!args) {
        continue;
      }
      const refreshSecs = this._refreshSecsForArgs(args);
      if (refreshSecs !== null) {
        entry.timer = setInterval(() => {
          void this._refresh(key, args);
        }, refreshSecs * 1000);
      }
    }
  }

  dispose(): void {
    for (const [key, entry] of this.panels.entries()) {
      if (entry.timer !== undefined) {
        clearInterval(entry.timer);
      }
      try {
        entry.panel.dispose();
      } catch (err) {
        this.extensionChannel.error(`DetailPanelController: dispose error for ${key}`, String(err));
      }
    }
    this.panels.clear();
    this._argsCache.clear();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  // Store args alongside panels for refresh/restartAllTimers
  private readonly _argsCache = new Map<string, PanelOpenArgs>();

  private _titleForArgs(args: PanelOpenArgs): string {
    switch (args.kind) {
      case "application": return `Application: ${args.appName}`;
      case "inventory": return args.label;
      case "events": return `Events · ${args.domain}`;
      case "logs": return `Logs · ${args.minLevel}+`;
    }
  }

  private _refreshSecsForArgs(args: PanelOpenArgs): number | null {
    if (args.kind === "events" || args.kind === "logs") {
      return this.refreshSecondsProvider();
    }
    return null;
  }

  private _disposeOldest(): void {
    let oldestKey: string | undefined;
    let oldestOrder = Infinity;

    for (const [key, entry] of this.panels.entries()) {
      if (entry.insertionOrder < oldestOrder) {
        oldestOrder = entry.insertionOrder;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      const entry = this.panels.get(oldestKey);
      if (entry) {
        if (entry.timer !== undefined) {
          clearInterval(entry.timer);
        }
        entry.messageDisposable?.dispose();
        try {
          entry.panel.dispose();
        } catch {
          // ignore
        }
      }
      this.panels.delete(oldestKey);
      this._argsCache.delete(oldestKey);
    }
  }

  private _cleanup(key: string): void {
    const entry = this.panels.get(key);
    if (entry?.timer !== undefined) {
      clearInterval(entry.timer);
    }
    entry?.messageDisposable?.dispose();
    this.panels.delete(key);
    this._argsCache.delete(key);
  }

  private _nonce(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async _refresh(key: string, args: PanelOpenArgs): Promise<void> {
    const entry = this.panels.get(key);
    if (!entry) {
      return;
    }

    // Cache args for future refresh calls
    this._argsCache.set(key, args);

    void entry.panel.webview.postMessage({ type: "loading" });

    try {
      const { rows, columns, filterBy, filterByMessage, filterByTs, extraSections, editConfig } = await this._fetchAndBuild(args);
      void entry.panel.webview.postMessage({ type: "update", columns, rows, filterBy, filterByMessage, filterByTs, extraSections, editConfig });
    } catch (err) {
      this.extensionChannel.error(`DetailPanelController: fetch error for ${key}`, String(err));
      void entry.panel.webview.postMessage({
        type: "error",
        message: String(err),
      });
    }
  }

  private async _refreshByEntry(key: string, _entry: PanelEntry): Promise<void> {
    const args = this._argsCache.get(key);
    if (!args) {
      return;
    }
    await this._refresh(key, args);
  }

  private async _fetchAndBuild(
    args: PanelOpenArgs,
  ): Promise<{ rows: PanelRow[]; columns: string[]; filterBy?: number; filterByMessage?: number; filterByTs?: boolean; extraSections?: Section[]; editConfig?: EditConfig }> {
    switch (args.kind) {
      case "application": {
        const [apps, connectors] = await Promise.all([
          fetchApplications(),
          fetchMatchingConnectorInstances(args.appId, { onlineOnly: false }).catch((): [] => []),
        ]);
        const app = apps.find((a) => a.id === args.appId);
        if (!app) {
          throw new Error(`Application not found: ${args.appId}`);
        }
        const typedApp = app as ApplicationFromApi;
        const data = { app: typedApp, connectors };
        return {
          rows: buildApplicationRows(data),
          columns: applicationColumns(),
          extraSections: [buildConnectorSection(connectors)],
          editConfig: buildEditConfig(typedApp),
        };
      }

      case "inventory": {
        const catDef = INVENTORY_CATEGORIES.find((c) => c.key === args.categoryKey);
        if (!catDef) {
          throw new Error(`Unknown inventory category: ${args.categoryKey}`);
        }
        const fetcherName = catDef.fetcherName as InventoryCategoryFetcherName;
        const fetcher = INVENTORY_FETCHERS[fetcherName];
        const items = await fetcher();
        return {
          rows: buildInventoryRows(args.categoryKey, items),
          columns: inventoryColumns(),
        };
      }

      case "events": {
        const events = await fetchPlatformEvents(50);
        return {
          rows: buildEventsRows(args.domain, events),
          columns: eventsColumns(),
        };
      }

      case "logs": {
        const levels = levelsForMinimum(args.minLevel);
        let logs;
        if (levels === null) {
          logs = await fetchPlatformLogs({ limit: 50 });
        } else {
          const results = await Promise.allSettled(
            levels.map((l) => fetchPlatformLogs({ limit: 50, level: l })),
          );
          const merged: import("../api/types").PlatformLogEntry[] = [];
          for (const r of results) {
            if (r.status === "fulfilled") {
              merged.push(...r.value);
            }
          }
          logs = merged;
        }
        const cols = logsColumns();
        return {
          rows: buildLogsRows(logs),
          columns: cols,
          filterBy: cols.indexOf("Correlation ID"),
          filterByMessage: cols.indexOf("Message"),
          filterByTs: true,
        };
      }
    }
  }
}
