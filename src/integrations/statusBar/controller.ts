import * as vscode from "vscode";

export interface StatusBarControllerOptions {
  readonly onClickCommand: string;
}

export interface StatusBarState {
  readonly online: number;
  readonly total: number;
  readonly unreachable: boolean;
}

/**
 * Owns a single `vscode.StatusBarItem` that displays the aggregated connector summary.
 *
 * The controller is a pure observer — it does not fetch data itself.
 * All state changes come through `update()`.
 *
 * Lifecycle note: the caller (`extension.ts`) pushes this controller into
 * `context.subscriptions`. When VS Code deactivates the extension it will call
 * `dispose()` on every subscription. The `disposed` guard below ensures that
 * multiple dispose calls are safe even if VS Code calls it more than once.
 *
 * The `StatusBarItem` is created and fully owned by this controller, so
 * `item.dispose()` is correct and called exactly once, protected by the
 * `disposed` guard.
 */
export class StatusBarController implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private disposed = false;

  constructor(options: StatusBarControllerOptions) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    // item.name is shown in the status bar context-menu as "Hide 'Aurelion connectors'"
    this.item.name = "Aurelion connectors";
    this.item.command = options.onClickCommand;
    // Item starts hidden; first update() call from the onDidChangeState subscription
    // will show it when data is available.
  }

  /**
   * Redraws the status bar item based on the provided state.
   *
   * Rules (in evaluation order):
   *  1. `unreachable === true` → warning background, regardless of total.
   *  2. `total === 0 && !unreachable` → hide the item (no useful info to show).
   *  3. Otherwise → show connector counts with normal background.
   *
   * `offline` is derived as `total - online`; there is no separate `offline` field
   * in `StatusBarState` (C-3 from architecture-guardian review).
   */
  update(state: StatusBarState): void {
    if (this.disposed) {
      return;
    }

    const { online, total, unreachable } = state;

    if (unreachable) {
      this.item.text = "$(warning) Aurelion kernel unreachable";
      this.item.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
      this.item.tooltip = "Kernel unreachable — click to open Applications view";
      this.item.show();
      return;
    }

    if (total === 0) {
      this.item.hide();
      return;
    }

    // Normal state: show connector counts
    const offline = total - online;
    this.item.text = `$(plug) ${online}/${total} connectors online`;
    this.item.backgroundColor = undefined;
    const md = new vscode.MarkdownString();
    md.appendMarkdown(
      `**Aurelion connectors**\n\n- Online: ${online}\n- Offline: ${offline}`,
    );
    md.isTrusted = false;
    this.item.tooltip = md;
    this.item.show();
  }

  /**
   * Idempotent dispose — safe to call multiple times.
   * `item.dispose()` is called exactly once, guarded by `this.disposed`.
   * We do NOT rely on any implicit idempotency of `StatusBarItem.dispose()` —
   * the guard here is the only guarantee.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.item.dispose();
  }
}
