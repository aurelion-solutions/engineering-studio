import * as vscode from "vscode";
import { renderTriggerRunPanelHtml } from "./triggerRunPanelHtml";
import {
  fetchPipelines,
  triggerPipelineRun,
  TriggerPipelineRunError,
} from "../api/platformClient";
import { parseArgsJson } from "../integrations/pipelines/triggerForm/triggerFormModel";

type TriggerRunPanelControllerOptions = {
  extensionChannel: vscode.LogOutputChannel;
  extensionUri: vscode.Uri;
};

/** Single-instance webview panel controller for the trigger pipeline run form. */
export class TriggerRunPanelController implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private messageDisposable: vscode.Disposable | undefined;
  private readonly extensionChannel: vscode.LogOutputChannel;
  private readonly extensionUri: vscode.Uri;

  constructor(options: TriggerRunPanelControllerOptions) {
    this.extensionChannel = options.extensionChannel;
    this.extensionUri = options.extensionUri;
  }

  /** Open the panel (create if not existing, reveal if already open). */
  openOrReveal(): void {
    if (this.panel !== undefined) {
      this.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "aurelion.triggerRunPanel",
      "Aurelion: Trigger Pipeline Run",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, "media"),
        ],
      },
    );

    this.panel = panel;

    const nonce = _generateNonce();
    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "trigger-run-webview.js"),
    );
    const cspSource = panel.webview.cspSource;

    panel.webview.html = renderTriggerRunPanelHtml(
      nonce,
      cspSource,
      scriptUri.toString(),
    );

    this.messageDisposable = panel.webview.onDidReceiveMessage(
      (msg: unknown) => {
        void this._handleMessage(msg);
      },
    );

    panel.onDidDispose(() => {
      this.messageDisposable?.dispose();
      this.messageDisposable = undefined;
      this.panel = undefined;
    });
  }

  /** Called when apiBaseUrl config changes — tell webview to reload pipelines list. */
  notifyApiBaseChanged(): void {
    if (this.panel !== undefined) {
      void this.panel.webview.postMessage({ type: "reload" });
    }
  }

  private async _handleMessage(msg: unknown): Promise<void> {
    if (typeof msg !== "object" || msg === null) {
      return;
    }
    const m = msg as Record<string, unknown>;

    switch (m["type"]) {
      case "loadPipelines":
        await this._handleLoadPipelines();
        break;

      case "submit":
        await this._handleSubmit(
          String(m["pipelineName"] ?? ""),
          m["args"] as Record<string, unknown> | undefined,
        );
        break;

      default:
        break;
    }
  }

  private async _handleLoadPipelines(): Promise<void> {
    try {
      const pipelines = await fetchPipelines();
      const names = pipelines.map((p) => p.name);
      void this.panel?.webview.postMessage({ type: "pipelines", names });
    } catch (e) {
      this.extensionChannel.error(
        "TriggerRunPanelController: fetchPipelines failed",
        String(e),
      );
      void this.panel?.webview.postMessage({
        type: "submitError",
        detail: `Failed to load pipelines: ${String(e)}`,
      });
    }
  }

  private async _handleSubmit(
    pipelineName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<void> {
    // PII guard: log only pipeline_name, never args payload.
    this.extensionChannel.info(
      "TriggerRunPanelController: submit",
      pipelineName,
    );

    // Defensive guard: re-validate args as a JSON object before POST.
    // Protects against tampered postMessage from a compromised webview.
    const argsForPost = args ?? {};
    const argsGuard = parseArgsJson(JSON.stringify(argsForPost));
    if (!argsGuard.ok) {
      void this.panel?.webview.postMessage({
        type: "submitError",
        detail: `Invalid args: ${argsGuard.error}`,
      });
      return;
    }

    try {
      const response = await triggerPipelineRun({
        pipeline_name: pipelineName,
        args: args ?? {},
      });
      // Log only pipeline_run_id, not args.
      this.extensionChannel.info(
        "TriggerRunPanelController: run created",
        response.pipeline_run_id,
      );
      void this.panel?.webview.postMessage({ type: "submitOk" });
      void vscode.commands.executeCommand("aurelion.refreshPipelines");
      this.panel?.dispose();
    } catch (e) {
      if (e instanceof TriggerPipelineRunError) {
        void this.panel?.webview.postMessage({
          type: "submitError",
          detail: e.detail,
        });
      } else {
        this.extensionChannel.error(
          "TriggerRunPanelController: submit failed",
          String(e),
        );
        void this.panel?.webview.postMessage({
          type: "submitError",
          detail: String(e),
        });
      }
    }
  }

  dispose(): void {
    this.messageDisposable?.dispose();
    this.messageDisposable = undefined;
    this.panel?.dispose();
    this.panel = undefined;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
