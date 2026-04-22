import * as vscode from "vscode";
import { ApplicationsTreeDataProvider } from "./integrations/applications/tree";
import { InventoryTreeDataProvider } from "./integrations/inventory/tree";
import { StatusBarController } from "./integrations/statusBar/controller";
import { LogDocumentContentProvider } from "./integrations/logs/contentProvider";
import { LOGS_SCHEME } from "./integrations/logs/uri";
import { LogStreamer } from "./integrations/logs/streamer";
import {
  isAppNode,
  isOpenLogsArg,
  isOpenDetailPanelArg,
} from "./integrations/commands/guards";
import { DetailPanelController } from "./panels/DetailPanelController";
import { EventsTreeDataProvider } from "./integrations/events/tree";
import { LogsLevelsTreeDataProvider } from "./integrations/logsLevels/tree";

export function activate(context: vscode.ExtensionContext): void {
  // ─── Extension-level log channel ─────────────────────────────────────────────
  // Single owner: context.subscriptions. Used for internal extension errors.
  const extensionChannel = vscode.window.createOutputChannel(
    "Aurelion · Extension",
    { log: true },
  );
  context.subscriptions.push(extensionChannel);

  // ─── Detail panel controller ─────────────────────────────────────────────────
  const detailPanels = new DetailPanelController({
    extensionChannel,
    refreshSecondsProvider: () =>
      Math.max(
        2,
        vscode.workspace
          .getConfiguration("aurelion.engineeringStudio")
          .get<number>("eventsRefreshSeconds", 5),
      ),
  });
  context.subscriptions.push(detailPanels);

  // ─── Applications tree ───────────────────────────────────────────────────────
  const applicationsProvider = new ApplicationsTreeDataProvider(extensionChannel);
  const applicationsTreeView = vscode.window.createTreeView(
    "aurelion.engineeringStudio.applicationsView",
    { treeDataProvider: applicationsProvider },
  );
  context.subscriptions.push(applicationsTreeView);
  context.subscriptions.push(applicationsProvider);

  applicationsProvider.setTreeView(applicationsTreeView);

  // ─── Inventory tree ──────────────────────────────────────────────────────────
  const inventoryProvider = new InventoryTreeDataProvider();
  const inventoryTreeView = vscode.window.createTreeView(
    "aurelion.engineeringStudio.inventoryView",
    { treeDataProvider: inventoryProvider },
  );
  context.subscriptions.push(inventoryTreeView);
  context.subscriptions.push(inventoryProvider);

  // ─── Events tree ─────────────────────────────────────────────────────────────
  const eventsProvider = new EventsTreeDataProvider();
  context.subscriptions.push(
    vscode.window.createTreeView("aurelion.engineeringStudio.eventsView", {
      treeDataProvider: eventsProvider,
    }),
  );
  context.subscriptions.push(eventsProvider);

  // ─── Logs levels tree ─────────────────────────────────────────────────────────
  const logsLevelsProvider = new LogsLevelsTreeDataProvider();
  context.subscriptions.push(
    vscode.window.createTreeView("aurelion.engineeringStudio.logsView", {
      treeDataProvider: logsLevelsProvider,
    }),
  );
  context.subscriptions.push(logsLevelsProvider);

  // ─── Status bar ──────────────────────────────────────────────────────────────
  const statusBar = new StatusBarController({
    onClickCommand: "aurelion.focusApplicationsView",
  });
  context.subscriptions.push(statusBar);

  // Update status bar whenever provider state changes
  context.subscriptions.push(
    applicationsProvider.onDidChangeState(() => {
      statusBar.update({
        total: applicationsProvider.getAppCount(),
        unreachable: applicationsProvider.lastRefreshFailed,
      });
    }),
  );

  // ─── Log infrastructure ──────────────────────────────────────────────────────
  const logsProvider = new LogDocumentContentProvider();
  context.subscriptions.push(logsProvider);
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(LOGS_SCHEME, logsProvider),
  );

  const streamer = new LogStreamer({
    provider: logsProvider,
    extensionChannel,
    pollMsProvider: () =>
      vscode.workspace
        .getConfiguration("aurelion.engineeringStudio")
        .get<number>("logStreamPollMs", 2500),
  });
  context.subscriptions.push(streamer);

  // ─── Commands ────────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelion.openDetailPanel", (arg: unknown) => {
      if (!isOpenDetailPanelArg(arg)) {
        extensionChannel.warn("openDetailPanel: invalid argument");
        return;
      }
      detailPanels.openOrReveal(arg);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelion.refreshEvents", () => {
      eventsProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelion.refreshLogs", () => {
      logsLevelsProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelion.refreshApplications", () => {
      void applicationsProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelion.focusApplicationsView", () => {
      void vscode.commands.executeCommand(
        "workbench.view.extension.aurelion-engineering-studio",
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelion.refreshInventory", () => {
      inventoryProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelion.focusInventoryView", () => {
      void vscode.commands.executeCommand(
        "aurelion.engineeringStudio.inventoryView.focus",
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aurelion.refreshApplication",
      (node: { appId: string }) => {
        void applicationsProvider.refreshApplication(node.appId);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aurelion.openLogs",
      async (arg?: unknown): Promise<void> => {
        let target: { appId: string; appName: string } | undefined;

        if (isOpenLogsArg(arg)) {
          target = { appId: arg.appId, appName: arg.appName };
        } else {
          const apps = applicationsProvider.getAppNodesForQuickPick();

          if (apps.length === 0) {
            void vscode.window.showInformationMessage(
              "No applications loaded. Refresh first.",
            );
            return;
          }

          const items = apps.map((a) => ({
            label: a.name,
            detail: a.id,
            appId: a.id,
            appName: a.name,
          }));

          const picked = await vscode.window.showQuickPick(items, {
            placeHolder: "Select an application to show logs",
          });

          if (picked === undefined) {
            return;
          }

          const currentApps = applicationsProvider.getAppNodesForQuickPick();
          const stillValid = currentApps.some((a) => a.id === picked.appId);
          if (!stillValid) {
            void vscode.window.showInformationMessage(
              "Application no longer available.",
            );
            return;
          }

          target = { appId: picked.appId, appName: picked.appName };
        }

        const uri = logsProvider.buildUri({
          id: target.appId,
          name: target.appName,
        });
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: false,
          preserveFocus: false,
        });
        streamer.enable({ id: target.appId, name: target.appName });
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aurelion.focusApplication",
      async (arg: unknown): Promise<void> => {
        const safeReveal = async (node: Parameters<typeof applicationsTreeView.reveal>[0]): Promise<void> => {
          try {
            await applicationsTreeView.reveal(node, {
              select: true,
              focus: true,
              expand: true,
            });
          } catch (err) {
            extensionChannel.error(
              "focusApplication: reveal failed",
              String(err),
            );
          }
        };

        if (isAppNode(arg)) {
          const node = applicationsProvider.getAppNodeById(arg.appId);
          if (!node) {
            return;
          }
          await safeReveal(node);
          return;
        }

        const apps = applicationsProvider.getAppNodesForQuickPick();
        if (apps.length === 0) {
          void vscode.window.showInformationMessage(
            'Aurelion: no applications loaded. Run "Aurelion: Refresh applications" first.',
          );
          return;
        }

        const items = apps.map((a) => ({
          label: a.name,
          description: "",
          id: a.id,
        }));

        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: "Select application to focus",
          matchOnDescription: true,
        });

        if (!picked) {
          return;
        }

        const node = applicationsProvider.getAppNodeById(picked.id);
        if (!node) {
          return;
        }
        await safeReveal(node);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelion.toggleLogStreaming", async () => {
      const apps = applicationsProvider.getAppNodesForQuickPick();

      if (apps.length === 0) {
        void vscode.window.showInformationMessage(
          "No applications loaded. Refresh first.",
        );
        return;
      }

      const items = apps.map((a) => ({
        label: a.name,
        detail: a.id,
        description: streamer.isEnabled(a.id) ? "[streaming]" : undefined,
        appId: a.id,
        appName: a.name,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select an application to toggle log streaming",
      });

      if (picked === undefined) {
        return;
      }

      const currentApps = applicationsProvider.getAppNodesForQuickPick();
      const stillValid = currentApps.some((a) => a.id === picked.appId);
      if (!stillValid) {
        void vscode.window.showInformationMessage(
          "Application no longer available.",
        );
        return;
      }

      if (streamer.isEnabled(picked.appId)) {
        streamer.disable(picked.appId);
        void vscode.window.showInformationMessage(
          `Log streaming disabled for "${picked.appName}".`,
        );
      } else {
        streamer.enable({ id: picked.appId, name: picked.appName });
        void vscode.window.showInformationMessage(
          `Log streaming enabled for "${picked.appName}".`,
        );
      }
    }),
  );

  // ─── Config change listener ───────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("aurelion.engineeringStudio.apiBaseUrl")) {
        void applicationsProvider.refresh();
        streamer.resetAllNewestTs();
        streamer.restartTick();
        detailPanels.refreshAll();
      }
      if (
        e.affectsConfiguration(
          "aurelion.engineeringStudio.logStreamPollMs",
        )
      ) {
        streamer.restartTick();
      }
      if (
        e.affectsConfiguration(
          "aurelion.engineeringStudio.refreshIntervalMs",
        )
      ) {
        const v = vscode.workspace
          .getConfiguration("aurelion.engineeringStudio")
          .get<number>("refreshIntervalMs", 0);
        applicationsProvider.setAutoRefreshIntervalMs(v);
      }
      if (
        e.affectsConfiguration(
          "aurelion.engineeringStudio.eventsRefreshSeconds",
        )
      ) {
        detailPanels.restartAllTimers();
      }
    }),
  );

  void applicationsProvider.refresh();

  const initialInterval = vscode.workspace
    .getConfiguration("aurelion.engineeringStudio")
    .get<number>("refreshIntervalMs", 0);
  applicationsProvider.setAutoRefreshIntervalMs(initialInterval);
}

export function deactivate(): void {}
