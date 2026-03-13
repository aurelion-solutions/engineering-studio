import * as vscode from "vscode";
import { ApplicationsTreeDataProvider } from "./integrations/applications/tree";
import { InventoryTreeDataProvider, CategoryNode } from "./integrations/inventory/tree";
import { StatusBarController } from "./integrations/statusBar/controller";
import { LogDocumentContentProvider } from "./integrations/logs/contentProvider";
import { LOGS_SCHEME } from "./integrations/logs/uri";
import { LogStreamer } from "./integrations/logs/streamer";
import {
  isConnectorNode,
  isAppNode,
  isOpenLogsArg,
  isRefreshInventoryCategoryArg,
} from "./integrations/commands/guards";

export function activate(context: vscode.ExtensionContext): void {
  // ─── Extension-level log channel ─────────────────────────────────────────────
  // Single owner: context.subscriptions. Used for internal extension errors.
  const extensionChannel = vscode.window.createOutputChannel(
    "Aurelion · Extension",
    { log: true },
  );
  context.subscriptions.push(extensionChannel);

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

  // ─── Status bar ──────────────────────────────────────────────────────────────
  const statusBar = new StatusBarController({
    onClickCommand: "aurelion.focusApplicationsView",
  });
  context.subscriptions.push(statusBar);

  // Update status bar whenever provider state changes (after refresh or per-app refresh)
  context.subscriptions.push(
    applicationsProvider.onDidChangeState(() => {
      const s = applicationsProvider.getConnectorSummary();
      statusBar.update({
        online: s.online,
        total: s.total,
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
    vscode.commands.registerCommand(
      "aurelion.refreshInventoryCategory",
      (node: unknown) => {
        if (node instanceof CategoryNode) {
          inventoryProvider.refreshCategory(node);
        } else if (isRefreshInventoryCategoryArg(node)) {
          const categoryNode = inventoryProvider.getCategoryNode(node.categoryKey);
          if (categoryNode) {
            inventoryProvider.refreshCategory(categoryNode);
          }
        }
      },
    ),
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
          // Tree-click branch: argument already carries appId + appName
          target = { appId: arg.appId, appName: arg.appName };
        } else {
          // Palette branch: quick-pick
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

          // G4: re-validate appId after await — the tree may have refreshed
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
      "aurelion.copyInstanceId",
      async (arg: unknown): Promise<void> => {
        if (!isConnectorNode(arg)) {
          extensionChannel.warn("copyInstanceId: unexpected argument");
          return;
        }
        try {
          await vscode.env.clipboard.writeText(arg.instanceId);
        } catch (err) {
          extensionChannel.error(
            "copyInstanceId: clipboard write failed",
            String(err),
          );
          void vscode.window.showErrorMessage(
            "Aurelion: failed to copy instance id",
          );
          return;
        }
        vscode.window.setStatusBarMessage(
          "$(check) Aurelion: instance id copied",
          1500,
        );
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

        // Palette branch
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

      // G4: re-validate appId after await — the tree may have refreshed
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
      // C-4: apiBaseUrl branch FIRST — it recreates the HTTP client and triggers
      // refresh(); refreshIntervalMs branch must come after so any new auto-tick
      // fires against the already-updated client, not the old one.
      if (e.affectsConfiguration("aurelion.engineeringStudio.apiBaseUrl")) {
        void applicationsProvider.refresh();
        // G8: reset cursors + restart tick when kernel URL changes
        streamer.resetAllNewestTs();
        streamer.restartTick();
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
    }),
  );

  void applicationsProvider.refresh();

  // S6: set auto-refresh AFTER first refresh() is fired, so the first fetch
  // completes before any periodic tick starts.
  const initialInterval = vscode.workspace
    .getConfiguration("aurelion.engineeringStudio")
    .get<number>("refreshIntervalMs", 0);
  applicationsProvider.setAutoRefreshIntervalMs(initialInterval);
}

export function deactivate(): void {}
