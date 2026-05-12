import * as vscode from "vscode";
import { renderPanelHtml } from "./panelHtml";
import type { PanelOpenArgs, PanelRow } from "./types";
import type { ApplicationFromApi, PipelineRunStatus } from "../api/types";
import type { EditConfig, Section } from "./types";
import {
  fetchApplications,
  fetchMatchingConnectorInstances,
  fetchPlatformEvents,
  fetchPlatformLogs,
  fetchPipelineRuns,
  fetchPipelineRunDetail,
  fetchPipelineStepDetail,
  fetchStepDetail,
  cancelPipelineRun,
  retryPipelineRun,
  updateApplication,
  fetchCustomers,
  fetchSubjects,
  fetchAccounts,
  fetchResources,
  fetchAccessFactsForState,
  fetchIncomingDeltaItems,
  fetchOutgoingPlanItems,
  fetchArtifactBindings,
  fetchInitiatives,
  fetchOwnershipAssignments,
  fetchAccessUsageFacts,
  fetchThreatFacts,
  fetchPersons,
  fetchPersonAttributes,
  fetchEmployees,
  fetchEmployeeAttributes,
  fetchNHIs,
  fetchEmployeeRecords,
  fetchCapabilities,
  fetchCapabilityMappings,
  fetchCapabilityGrants,
  fetchSodRules,
  fetchSodRuleConditions,
  fetchFindings,
  fetchMitigations,
  fetchScanRuns,
  fetchFeedbacks,
  fetchLlmModels,
  fetchLlmExecutionProfiles,
  fetchPipelines,
  fetchPipelineDetail,
  fetchAccessStateDiffCount,
  fetchAccountsForState,
  fetchAccountIncomingDeltaItems,
  fetchAccountOutgoingPlanItems,
  fetchAccountStateDiffCount,
} from "../api/platformClient";
import { dispatchPipelineAction } from "./pipelineActionDispatch";
import type { PipelineActionMsg } from "./pipelineActionDispatch";
import {
  closeCurrentPreviewIfUnpinned,
  getAurelionColumn,
  handleDrillDownFrom,
  markPanelAsPreview,
  rememberAurelionColumn,
} from "./panelLifecycle";
import { INVENTORY_CATEGORIES } from "../integrations/inventory/inventoryCategories";
import type { InventoryCategoryFetcherName, AccessStateTab, AccountStateTab } from "../integrations/inventory/inventoryCategories";
import { ACCESS_ANALYSIS_CATEGORIES } from "../integrations/accessAnalysis/accessAnalysisCategories";
import type { AccessAnalysisCategoryFetcherName } from "../integrations/accessAnalysis/accessAnalysisCategories";

type InventoryFetcher = () => Promise<unknown[]>;

const INVENTORY_FETCHERS: Record<InventoryCategoryFetcherName, InventoryFetcher> = {
  fetchCustomers: () => fetchCustomers(),
  fetchSubjects: () => fetchSubjects(),
  fetchAccounts: () => fetchAccounts(),
  fetchAccountsForState: () => fetchAccountsForState(),
  fetchAccountIncomingDeltaItems: async () => { const r = await fetchAccountIncomingDeltaItems(); return r.items; },
  fetchAccountOutgoingPlanItems: async () => { const r = await fetchAccountOutgoingPlanItems(); return r.items; },
  fetchResources: () => fetchResources(),
  // Access State tabs — used directly in the accessState case, not via this map
  fetchAccessFactsForState: () => fetchAccessFactsForState(),
  fetchIncomingDeltaItems: async () => { const r = await fetchIncomingDeltaItems(); return r.items; },
  fetchOutgoingPlanItems: async () => { const r = await fetchOutgoingPlanItems(); return r.items; },
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

type AccessAnalysisFetcher = () => Promise<unknown[]>;

const ACCESS_ANALYSIS_FETCHERS: Record<AccessAnalysisCategoryFetcherName, AccessAnalysisFetcher> = {
  fetchCapabilities: () => fetchCapabilities(),
  fetchCapabilityMappings: () => fetchCapabilityMappings(),
  fetchCapabilityGrants: () => fetchCapabilityGrants(),
  fetchSodRules: () => fetchSodRules(),
  fetchFindings: () => fetchFindings(),
  fetchMitigations: () => fetchMitigations(),
  fetchScanRuns: () => fetchScanRuns(),
  fetchFeedbacks: () => fetchFeedbacks(),
};
import { buildApplicationRows, applicationColumns, buildConnectorSection, buildEditConfig } from "./renderers/applicationRenderer";
import { buildInventoryRows, inventoryColumns } from "./renderers/inventoryListRenderer";
import { buildAccessStateRows, accessStateColumns } from "./renderers/accessStateListRenderer";
import { buildAccountStateRows, accountStateColumns } from "./renderers/accountStateListRenderer";
import type { AccessStateTabKey, AccountStateTabKey } from "./types";
import { buildAccessAnalysisRows, accessAnalysisColumns } from "./renderers/accessAnalysisListRenderer";
import { buildEventsRows, eventsColumns } from "./renderers/eventsListRenderer";
import { buildLogsRows, logsColumns } from "./renderers/logsListRenderer";
import { buildItemDetailRows, itemDetailColumns, buildSodConditionsSection } from "./renderers/itemDetailRenderer";
import { buildLlmModelRows, llmModelColumns, buildLlmModelProfilesSection } from "./renderers/llmModelRenderer";
import { buildPipelineRunsRows, pipelineRunsColumns } from "./renderers/pipelineRunsListRenderer";
import {
  buildPipelineRunDetailHeaderRows,
  pipelineRunDetailHeaderColumns,
  buildPipelineRunDetailStepsSection,
  buildPipelineRunDag,
  TERMINAL_RUN_STATUSES,
} from "./renderers/pipelineRunDetailRenderer";
import {
  buildPipelineStepDetailHeaderRows,
  pipelineStepDetailHeaderColumns,
} from "./renderers/pipelineStepDetailRenderer";
import {
  pipelineDefinitionsColumns,
  buildPipelineDefinitionsRows,
} from "./renderers/pipelineDefinitionsListRenderer";
import {
  pipelineDefinitionHeaderColumns,
  buildPipelineDefinitionHeaderRows,
  buildPipelineDefinitionTriggersSection,
  buildPipelineDefinitionDag,
} from "./renderers/pipelineDefinitionDetailRenderer";
import type { DagDescriptor } from "./renderers/pipelineDefinitionDetailRenderer";
import { levelsForMinimum } from "../integrations/logs/levelFilter";

export type { PanelOpenArgs };

export interface DetailPanelControllerOptions {
  readonly extensionChannel: vscode.LogOutputChannel;
  readonly refreshSecondsProvider: () => number;
  readonly extensionUri: vscode.Uri;
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
  private readonly extensionUri: vscode.Uri;
  // Maps panel key → last fetched raw items (for row-click drill-down)
  private readonly _itemCache = new Map<string, Record<string, unknown>[]>();

  constructor(options: DetailPanelControllerOptions) {
    this.extensionChannel = options.extensionChannel;
    this.refreshSecondsProvider = options.refreshSecondsProvider;
    this.extensionUri = options.extensionUri;
  }

  openOrReveal(args: PanelOpenArgs, opts?: { drillDown?: boolean; fromPanel?: vscode.WebviewPanel }): void {
    const key = `${args.kind}:${args.ctxKey}`;
    const existing = this.panels.get(key);

    if (existing) {
      existing.panel.reveal(existing.panel.viewColumn ?? getAurelionColumn());
      void this._refresh(key, args);
      return;
    }

    // Preview-tab behavior:
    //  - drillDown from current preview: promote parent, new panel = preview
    //  - drill-down from already-promoted parent (sibling navigation): close
    //    previous sibling preview, new panel = preview
    //  - non-drill-down (treeview/command): always close current preview
    if (opts?.drillDown === true) {
      handleDrillDownFrom(opts.fromPanel);
    } else {
      closeCurrentPreviewIfUnpinned();
    }

    // Enforce cap
    if (this.panels.size >= MAX_PANELS) {
      this._disposeOldest();
    }

    const panel = vscode.window.createWebviewPanel(
      "aurelionDetail",
      this._titleForArgs(args),
      getAurelionColumn(),
      { enableScripts: true, retainContextWhenHidden: true },
    );
    rememberAurelionColumn(panel.viewColumn);
    markPanelAsPreview(panel);

    const nonce = this._nonce();
    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "panel-webview.js"),
    ).toString();
    const cytoscapeUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "cytoscape.min.js"),
    ).toString();
    const dagreUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "dagre.min.js"),
    ).toString();
    const cytoscapeDagreUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "cytoscape-dagre.js"),
    ).toString();
    panel.webview.html = renderPanelHtml({
      nonce,
      cspSource: panel.webview.cspSource,
      scriptUri,
      cytoscapeUri,
      dagreUri,
      cytoscapeDagreUri,
    });

    const entry: PanelEntry = {
      panel,
      timer: undefined,
      insertionOrder: this.insertionCounter++,
    };

    this.panels.set(key, entry);

    entry.messageDisposable = panel.webview.onDidReceiveMessage(async (msg: { type: string; appId?: string; payload?: Record<string, unknown>; id?: string; verb?: string; runId?: string; section?: string; stepName?: string; stepId?: string | null; message?: string; tab?: string }) => {
      if (msg.type === "dagWarning" && typeof msg.message === "string") {
        this.extensionChannel.warn(`[DAG] ${msg.message}`);
        return;
      }
      if (msg.type === "dagNodeClick" && typeof msg.stepName === "string") {
        this.extensionChannel.info(`DetailPanelController: dagNodeClick step="${msg.stepName}" panel="${key}"`);
        // Lazy fetch for run-detail DAG node click. When stepId is null
        // (orphan node — step never executed), the webview already has the
        // sentinel including planned `definition_args` and renders it
        // directly; we skip the round-trip and don't send `dagNodeDetail`
        // (which would overwrite the richer client-side payload).
        if (args.kind === "pipelineRunDetail") {
          const stepId = msg.stepId ?? null;
          const stepName = msg.stepName;
          if (stepId === null) {
            // No-op — webview handles orphan node locally.
          } else {
            try {
              const detail = await fetchStepDetail(args.runId, stepId);
              void entry.panel.webview.postMessage({
                type: "dagNodeDetail",
                stepName,
                detail: {
                  args: detail.args,
                  result: detail.result,
                  error: detail.error,
                  status: detail.status,
                  attempt: detail.attempt,
                  started_at: detail.started_at,
                  finished_at: detail.finished_at,
                },
              });
            } catch (err) {
              this.extensionChannel.error(`DetailPanelController: fetchStepDetail error for step=${stepId}`, String(err));
              void entry.panel.webview.postMessage({
                type: "dagNodeDetail",
                stepName,
                error: String(err),
              });
            }
          }
        }
        return;
      }
      if (msg.type === "pipelineAction" && (msg.verb === "cancel" || msg.verb === "retry") && typeof msg.runId === "string") {
        const actionMsg: PipelineActionMsg = { verb: msg.verb, runId: msg.runId };
        await dispatchPipelineAction(
          {
            cancelFn: cancelPipelineRun,
            retryFn: retryPipelineRun,
            confirm: async (prompt) => {
              const answer = await vscode.window.showWarningMessage(prompt, { modal: true }, "Confirm");
              return answer === "Confirm";
            },
            showInfo: (message) => { void vscode.window.showInformationMessage(message); },
            showError: (message) => { void vscode.window.showErrorMessage(message); },
            logError: (message) => { this.extensionChannel.error(`DetailPanelController: pipeline action error`, message); },
            refresh: () => { void this._refresh(key, args); },
          },
          actionMsg,
        );
      }
      if (msg.type === "patch" && msg.appId && msg.payload) {
        try {
          await updateApplication(msg.appId, msg.payload);
          void this._refresh(key, args);
        } catch (err) {
          this.extensionChannel.error(`DetailPanelController: patch error for ${key}`, String(err));
          void entry.panel.webview.postMessage({ type: "error", message: String(err) });
        }
      }
      if (msg.type === "switch-tab" && typeof msg.tab === "string" && (args.kind === "accessState" || args.kind === "accountState")) {
        const validTabs: string[] = ["list", "incoming", "outgoing"];
        if (!validTabs.includes(msg.tab)) { return; }
        const currentEntry = this.panels.get(key);
        if (!currentEntry) { return; }
        const newArgs: PanelOpenArgs = args.kind === "accessState"
          ? { ...args, activeTab: msg.tab as AccessStateTabKey }
          : { ...args, activeTab: msg.tab as AccountStateTabKey };
        this._argsCache.set(key, newArgs);
        currentEntry.panel.title = this._titleForArgs(newArgs);
        void this._refresh(key, newArgs);
        return;
      }
      if (msg.type === "stepClick" && typeof msg.id === "string" && msg.id.length > 0 && msg.section === "steps" && args.kind === "pipelineRunDetail") {
        this.openOrReveal({
          kind: "pipelineStepDetail",
          ctxKey: `step:${args.runId}:${msg.id}`,
          runId: args.runId,
          stepName: msg.id,
          pipelineName: args.pipelineName,
        }, { drillDown: true, fromPanel: entry.panel });
        return;
      }
      if (msg.type === "itemClick" && msg.id) {
        if (args.kind === "pipelineRuns") {
          const runs = this._itemCache.get(key) ?? [];
          const run = runs.find((r) => String(r["id"]) === msg.id);
          if (!run) { return; }
          this.openOrReveal({
            kind: "pipelineRunDetail",
            ctxKey: `run:${msg.id}`,
            runId: msg.id,
            pipelineName: String(run["pipeline_name"] ?? msg.id.slice(0, 8)),
            status: run["status"] as PipelineRunStatus | undefined,
          }, { drillDown: true, fromPanel: entry.panel });
          return;
        }
        if (args.kind === "pipelineDefinitions") {
          this.openOrReveal({
            kind: "pipelineDefinitionDetail",
            ctxKey: `pipeline-def:${msg.id}`,
            name: msg.id,
          }, { drillDown: true, fromPanel: entry.panel });
          return;
        }
        const items = this._itemCache.get(key) ?? [];
        const item = items.find(
          (it) => String(it["id"]) === msg.id || String(it["external_id"]) === msg.id,
        );
        if (!item) { return; }
        const parentKind = args.kind === "inventory" || args.kind === "accessAnalysis" ? args.kind : undefined;
        if (!parentKind) { return; }
        const categoryKey = (args as { categoryKey?: string }).categoryKey ?? "";
        const label = String(item["name"] ?? item["slug"] ?? item["code"] ?? item["username"] ?? item["external_id"] ?? msg.id.slice(0, 8));
        this.openOrReveal({
          kind: "itemDetail",
          ctxKey: `item:${msg.id}`,
          parentKind,
          categoryKey,
          itemId: msg.id,
          label,
          item,
        }, { drillDown: true, fromPanel: entry.panel });
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
    this._itemCache.clear();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  // Store args alongside panels for refresh/restartAllTimers
  private readonly _argsCache = new Map<string, PanelOpenArgs>();

  private _titleForArgs(args: PanelOpenArgs): string {
    switch (args.kind) {
      case "application": return `Application: ${args.appName}`;
      case "inventory": return args.label;
      case "accessState": return `Access State · ${args.activeTab}`;
      case "accountState": return `Accounts · ${args.activeTab}`;
      case "events": return `Events · ${args.domain}`;
      case "logs": return `Logs · ${args.minLevel}+`;
      case "accessAnalysis": return args.label;
      case "itemDetail": return args.label;
      case "llmModel": return `LLM Model: ${args.label}`;
      case "llmModelsList": return "LLM Models";
      case "pipelineRuns": return `Pipeline runs · ${args.label}`;
      case "pipelineRunDetail": return `Run · ${args.pipelineName} · ${args.runId.slice(0, 8)}`;
      case "pipelineStepDetail": return `Step · ${args.pipelineName} · ${args.stepName}`;
      case "pipelineDefinitions": return "Pipeline definitions";
      case "pipelineDefinitionDetail": return `Pipeline · ${args.name}`;
    }
  }

  private _refreshSecsForArgs(args: PanelOpenArgs): number | null {
    if (args.kind === "events" || args.kind === "logs" || args.kind === "pipelineRuns") {
      return this.refreshSecondsProvider();
    }
    if (args.kind === "pipelineRunDetail") {
      return args.status !== undefined && TERMINAL_RUN_STATUSES.has(args.status)
        ? null
        : this.refreshSecondsProvider();
    }
    if (args.kind === "llmModel") {
      return null;
    }
    if (args.kind === "pipelineStepDetail") {
      return null;
    }
    if (args.kind === "pipelineDefinitions" || args.kind === "pipelineDefinitionDetail") {
      return null;
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
      const { rows, columns, filters, filterByTs, extraSections, editConfig, dag, dagIsRunDag, accessStateTabs, accessStateActiveTab, accessStateCounts } = await this._fetchAndBuild(args);
      if (accessStateTabs !== undefined && accessStateActiveTab !== undefined) {
        void entry.panel.webview.postMessage({
          type: "set-tabs",
          tabs: accessStateTabs,
          activeTab: accessStateActiveTab,
          counts: accessStateCounts,
        });
      } else if (args.kind !== "accessState" && args.kind !== "accountState") {
        void entry.panel.webview.postMessage({ type: "clear-tabs" });
      }
      void entry.panel.webview.postMessage({ type: "update", columns, rows, filters, filterByTs, extraSections, editConfig, dag, dagIsRunDag });
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
  ): Promise<{ rows: PanelRow[]; columns: string[]; filters?: Array<{ label: string; columnIndex: number }>; filterByTs?: boolean; extraSections?: Section[]; editConfig?: EditConfig; dag?: DagDescriptor; dagIsRunDag?: boolean; accessStateTabs?: AccessStateTab[]; accessStateActiveTab?: AccessStateTabKey | AccountStateTabKey; accessStateCounts?: { incoming: number; outgoing: number } }> {
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
        const panelKey = `${args.kind}:${args.ctxKey}`;

        let items = await fetcher();

        if (args.categoryKey === "employees") {
          const persons = await fetchPersons().catch(() => []);
          const personMap = new Map(persons.map((p) => [p.id, p]));
          items = (items as Record<string, unknown>[]).map((emp) => {
            const personId = emp["person_id"] as string | undefined;
            const person = personId ? personMap.get(personId) : undefined;
            return { ...emp, _person_full_name: person?.full_name ?? "" };
          });
        }

        this._itemCache.set(panelKey, items as Record<string, unknown>[]);
        const cols = inventoryColumns(args.categoryKey);
        const nameFilters: Array<{ label: string; columnIndex: number }> =
          args.categoryKey === "persons"
            ? [{ label: "Full Name", columnIndex: cols.indexOf("Full Name") }]
            : args.categoryKey === "employees"
            ? [{ label: "Person", columnIndex: cols.indexOf("Person") }]
            : [];
        return {
          rows: buildInventoryRows(args.categoryKey, items),
          columns: cols,
          filters: nameFilters.length > 0 ? nameFilters : undefined,
        };
      }

      case "accessState": {
        const tab = args.activeTab as AccessStateTabKey;

        const dataFetch = (async (): Promise<unknown[]> => {
          switch (tab) {
            case "list":
              return fetchAccessFactsForState({ limit: 50 });
            case "incoming": {
              const result = await fetchIncomingDeltaItems({ status: "pending", limit: 50 });
              return result.items;
            }
            case "outgoing": {
              const result = await fetchOutgoingPlanItems({
                execution_status: "proposed,executing",
                plan_status: "active",
                limit: 50,
              });
              return result.items;
            }
          }
        })();

        const countsFetch = fetchAccessStateDiffCount().catch(() => ({
          incoming: 0,
          outgoing: 0,
          total: 0,
        }));

        const [items, counts] = await Promise.all([dataFetch, countsFetch]);

        const accessStateCatDef = INVENTORY_CATEGORIES.find((c) => c.key === "accessState");
        const tabs: AccessStateTab[] = accessStateCatDef?.tabs ?? [];

        return {
          rows: buildAccessStateRows(tab, items),
          columns: accessStateColumns(tab),
          accessStateTabs: tabs,
          accessStateActiveTab: tab,
          accessStateCounts: { incoming: counts.incoming, outgoing: counts.outgoing },
        };
      }

      case "accountState": {
        const tab = args.activeTab as AccountStateTabKey;

        const dataFetch = (async (): Promise<unknown[]> => {
          switch (tab) {
            case "list":
              return fetchAccountsForState({ limit: 50 });
            case "incoming": {
              const result = await fetchAccountIncomingDeltaItems({ status: "pending", limit: 50 });
              return result.items;
            }
            case "outgoing": {
              const result = await fetchAccountOutgoingPlanItems({
                execution_status: "proposed,executing",
                plan_status: "active",
                limit: 50,
              });
              return result.items;
            }
          }
        })();

        const countsFetch = fetchAccountStateDiffCount().catch(() => ({
          incoming: 0,
          outgoing: 0,
          total: 0,
        }));

        const [items, counts] = await Promise.all([dataFetch, countsFetch]);

        const accountStateCatDef = INVENTORY_CATEGORIES.find((c) => c.key === "accountState");
        const tabs: AccountStateTab[] = accountStateCatDef?.tabs ?? [];

        return {
          rows: buildAccountStateRows(tab, items),
          columns: accountStateColumns(tab),
          accessStateTabs: tabs as unknown as AccessStateTab[],
          accessStateActiveTab: tab,
          accessStateCounts: { incoming: counts.incoming, outgoing: counts.outgoing },
        };
      }

      case "accessAnalysis": {
        const catDef = ACCESS_ANALYSIS_CATEGORIES.find((c) => c.key === args.categoryKey);
        if (!catDef) {
          throw new Error(`Unknown access analysis category: ${args.categoryKey}`);
        }
        const fetcherName = catDef.fetcherName as AccessAnalysisCategoryFetcherName;
        const fetcher = ACCESS_ANALYSIS_FETCHERS[fetcherName];
        const items = await fetcher();
        const panelKey = `${args.kind}:${args.ctxKey}`;
        this._itemCache.set(panelKey, items as Record<string, unknown>[]);
        return {
          rows: buildAccessAnalysisRows(args.categoryKey, items),
          columns: accessAnalysisColumns(),
        };
      }

      case "itemDetail": {
        const extraSections: Section[] = [];

        // Strip synthetic enrichment fields before rendering main detail rows
        const cleanItem = Object.fromEntries(
          Object.entries(args.item).filter(([k]) => !k.startsWith("_")),
        );

        if (args.categoryKey === "sodRules" && typeof args.item["id"] === "number") {
          const [conditions, caps] = await Promise.all([
            fetchSodRuleConditions(args.item["id"] as number),
            fetchCapabilities(),
          ]);
          extraSections.push(buildSodConditionsSection(conditions, caps));
        }

        if (args.categoryKey === "persons" && typeof args.item["id"] === "string") {
          const attrs = await fetchPersonAttributes(args.item["id"]).catch(() => []);
          extraSections.push({
            title: "Attributes",
            columns: ["Key", "Value"],
            rows: attrs.length > 0
              ? attrs.map((a) => ({
                  id: a.id,
                  cells: [
                    { kind: "kv" as const, value: a.key },
                    { kind: "text" as const, value: a.value },
                  ],
                }))
              : [{ id: "no-attrs", cells: [{ kind: "text" as const, value: "No attributes" }, { kind: "text" as const, value: "" }] }],
          });
        }

        if (args.categoryKey === "employees" && typeof args.item["id"] === "string") {
          const personId = args.item["person_id"] as string | undefined;
          const [attrs, persons] = await Promise.all([
            fetchEmployeeAttributes(args.item["id"]).catch(() => []),
            personId ? fetchPersons().catch(() => []) : Promise.resolve([]),
          ]);
          const person = personId ? persons.find((p) => p.id === personId) : undefined;

          if (person) {
            extraSections.push({
              title: "Person",
              columns: ["Field", "Value"],
              rows: [
                { id: "p-id",  cells: [{ kind: "kv" as const, value: "id" },           { kind: "text" as const, value: person.id }] },
                { id: "p-ext", cells: [{ kind: "kv" as const, value: "external_id" },   { kind: "text" as const, value: person.external_id }] },
                { id: "p-nm",  cells: [{ kind: "kv" as const, value: "full_name" },     { kind: "text" as const, value: person.full_name }] },
              ],
            });
          }

          extraSections.push({
            title: "Attributes",
            columns: ["Key", "Value"],
            rows: attrs.length > 0
              ? attrs.map((a) => ({
                  id: a.id,
                  cells: [
                    { kind: "kv" as const, value: a.key },
                    { kind: "text" as const, value: a.value },
                  ],
                }))
              : [{ id: "no-attrs", cells: [{ kind: "text" as const, value: "No attributes" }, { kind: "text" as const, value: "" }] }],
          });
        }

        return {
          rows: buildItemDetailRows(cleanItem),
          columns: itemDetailColumns(),
          extraSections,
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
          filters: [
            { label: "Correlation ID", columnIndex: cols.indexOf("Correlation ID") },
            { label: "Message", columnIndex: cols.indexOf("Message") },
          ],
          filterByTs: true,
        };
      }

      case "llmModel": {
        const [models, profiles] = await Promise.all([
          fetchLlmModels(),
          fetchLlmExecutionProfiles(),
        ]);
        const model = models.find((m) => m.id === args.modelId);
        if (!model) {
          throw new Error(`LLM model not found: ${args.modelId}`);
        }
        const modelProfiles = profiles.filter((p) => p.model_id === args.modelId);
        return {
          rows: buildLlmModelRows(model),
          columns: llmModelColumns(),
          extraSections: [buildLlmModelProfilesSection(modelProfiles)],
        };
      }

      case "llmModelsList": {
        const models = await fetchLlmModels();
        return {
          rows: models.map((m) => ({
            id: m.id,
            cells: [
              { kind: "text" as const, value: m.name },
              { kind: "badge" as const, value: m.provider },
              { kind: "status" as const, value: m.is_active ? "active" : "inactive" },
            ],
          })),
          columns: ["Name", "Provider", "Status"],
        };
      }

      case "pipelineRuns": {
        const runs = await fetchPipelineRuns({
          status: [args.statusKey as PipelineRunStatus],
          limit: 100,
        });
        const panelKey = `${args.kind}:${args.ctxKey}`;
        this._itemCache.set(panelKey, runs as unknown as Record<string, unknown>[]);
        return {
          rows: buildPipelineRunsRows(runs),
          columns: pipelineRunsColumns(),
        };
      }

      case "pipelineRunDetail": {
        const [detail, definition] = await Promise.all([
          fetchPipelineRunDetail(args.runId),
          fetchPipelineDetail(args.pipelineName).catch((err: unknown) => {
            this.extensionChannel.error(
              `DetailPanelController: fetchPipelineDetail failed for run ${args.runId}`,
              String(err),
            );
            return null;
          }),
        ]);
        const key = `${args.kind}:${args.ctxKey}`;
        this._argsCache.set(key, { ...args, status: detail.status });
        if (TERMINAL_RUN_STATUSES.has(detail.status)) {
          const entry = this.panels.get(key);
          if (entry?.timer !== undefined) {
            clearInterval(entry.timer);
            entry.timer = undefined;
          }
        }
        const dag = definition !== null ? buildPipelineRunDag(detail, definition) : undefined;
        return {
          rows: buildPipelineRunDetailHeaderRows(detail),
          columns: pipelineRunDetailHeaderColumns(),
          extraSections: [buildPipelineRunDetailStepsSection(detail)],
          dag,
          dagIsRunDag: dag !== undefined,
        };
      }

      case "pipelineStepDetail": {
        const detail = await fetchPipelineStepDetail(args.runId, args.stepName);
        return {
          rows: buildPipelineStepDetailHeaderRows(detail),
          columns: pipelineStepDetailHeaderColumns(),
        };
      }

      case "pipelineDefinitions": {
        const defs = await fetchPipelines();
        const panelKey = `${args.kind}:${args.ctxKey}`;
        this._itemCache.set(panelKey, defs as unknown as Record<string, unknown>[]);
        return {
          rows: buildPipelineDefinitionsRows(defs),
          columns: pipelineDefinitionsColumns(),
          extraSections: [],
        };
      }

      case "pipelineDefinitionDetail": {
        const detail = await fetchPipelineDetail(args.name);
        const dag = buildPipelineDefinitionDag(detail);
        return {
          rows: buildPipelineDefinitionHeaderRows(detail),
          columns: pipelineDefinitionHeaderColumns(),
          extraSections: [
            buildPipelineDefinitionTriggersSection(detail),
          ],
          dag,
        };
      }
    }
  }
}
