import * as vscode from "vscode";

let preferredColumn: vscode.ViewColumn | undefined;
let currentPreviewPanel: vscode.WebviewPanel | undefined;

export function getAurelionColumn(): vscode.ViewColumn {
  return preferredColumn ?? vscode.ViewColumn.Beside;
}

export function rememberAurelionColumn(column: vscode.ViewColumn | undefined): void {
  if (column === undefined) {
    return;
  }
  if (column === vscode.ViewColumn.Active || column === vscode.ViewColumn.Beside) {
    return;
  }
  preferredColumn = column;
}

export function resetAurelionColumn(): void {
  preferredColumn = undefined;
}

/**
 * Mark `panel` as the current preview panel. The next non-drill-down open will
 * dispose it (unless the user pinned the tab via VS Code's native Pin Tab).
 * Auto-clears tracking when the panel disposes.
 */
export function markPanelAsPreview(panel: vscode.WebviewPanel): void {
  currentPreviewPanel = panel;
  panel.onDidDispose(() => {
    if (currentPreviewPanel === panel) {
      currentPreviewPanel = undefined;
    }
  });
}

/**
 * Stop tracking the current preview without disposing it — used for drill-down
 * navigation where the parent panel must stay open while a deeper view becomes
 * the new preview.
 */
export function releaseCurrentPreview(): void {
  currentPreviewPanel = undefined;
}

/**
 * Handle a drill-down open initiated from `fromPanel`:
 *  - If `fromPanel` IS the current preview, promote it (release tracking) so
 *    the parent survives the drill-down.
 *  - Otherwise, the drill-down is a sibling from an already-promoted parent —
 *    dispose the previous sibling preview unless the user pinned it.
 */
export function handleDrillDownFrom(fromPanel: vscode.WebviewPanel | undefined): void {
  if (fromPanel !== undefined && currentPreviewPanel === fromPanel) {
    releaseCurrentPreview();
    return;
  }
  closeCurrentPreviewIfUnpinned();
}

/**
 * Dispose the current preview panel if its tab is not pinned. If the user
 * pinned it natively, leave it alone and just stop tracking.
 */
export function closeCurrentPreviewIfUnpinned(): void {
  const panel = currentPreviewPanel;
  if (panel === undefined) {
    return;
  }
  currentPreviewPanel = undefined;

  if (_isPanelTabPinned(panel)) {
    return;
  }
  try {
    panel.dispose();
  } catch {
    // panel may already be disposed — ignore
  }
}

function _isPanelTabPinned(panel: vscode.WebviewPanel): boolean {
  const tabGroups = vscode.window.tabGroups;
  if (tabGroups === undefined) {
    return false;
  }
  const TabInputWebview = vscode.TabInputWebview;
  if (TabInputWebview === undefined) {
    return false;
  }

  for (const group of tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      if (!(input instanceof TabInputWebview)) {
        continue;
      }
      if (tab.label !== panel.title) {
        continue;
      }
      if (_viewTypeMatches(input.viewType, panel.viewType)) {
        return tab.isPinned;
      }
    }
  }
  return false;
}

function _viewTypeMatches(tabViewType: string | undefined, panelViewType: string): boolean {
  if (tabViewType === undefined || tabViewType.length === 0) {
    return false;
  }
  return (
    tabViewType === panelViewType ||
    tabViewType.endsWith(`-${panelViewType}`) ||
    tabViewType.endsWith(`:${panelViewType}`)
  );
}
