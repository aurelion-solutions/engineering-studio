import * as vscode from "vscode";
import { renderInferencePanelHtml } from "./inferencePanelHtml";
import {
  fetchLlmExecutionProfiles,
  fetchLlmModels,
  runInference,
  streamInference,
} from "../api/platformClient";
import type { LLMInferenceStreamChunk } from "../api/types";

type InferencePanelControllerOptions = {
  extensionChannel: vscode.LogOutputChannel;
  extensionUri: vscode.Uri;
};

/** Single-instance webview panel controller for LLM inference. */
export class InferencePanelController implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private currentAbort: AbortController | undefined;
  private messageDisposable: vscode.Disposable | undefined;
  private readonly extensionChannel: vscode.LogOutputChannel;
  private readonly extensionUri: vscode.Uri;

  constructor(options: InferencePanelControllerOptions) {
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
      "aurelion.inferencePanel",
      "Aurelion LLM Inference",
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

    // Build nonce and URIs
    const nonce = _generateNonce();
    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "inference-webview.js"),
    );
    const cspSource = panel.webview.cspSource;

    panel.webview.html = renderInferencePanelHtml(
      nonce,
      cspSource,
      scriptUri.toString(),
    );

    // Register message handler
    this.messageDisposable = panel.webview.onDidReceiveMessage(
      (msg: unknown) => {
        void this._handleMessage(msg);
      },
    );

    // Cleanup on close
    panel.onDidDispose(() => {
      this._cancelInflight();
      this.messageDisposable?.dispose();
      this.messageDisposable = undefined;
      this.panel = undefined;
    });
  }

  /** Called when apiBaseUrl config changes — abort inflight, tell webview to reload. */
  notifyApiBaseChanged(): void {
    this._cancelInflight();
    if (this.panel !== undefined) {
      void this.panel.webview.postMessage({ type: "reload" });
    }
  }

  /** Cancel any in-flight request. */
  private _cancelInflight(): void {
    if (this.currentAbort !== undefined) {
      this.currentAbort.abort();
      this.currentAbort = undefined;
    }
  }

  private async _handleMessage(msg: unknown): Promise<void> {
    if (typeof msg !== "object" || msg === null) {
      return;
    }
    const m = msg as Record<string, unknown>;

    switch (m["type"]) {
      case "loadProfiles":
        await this._loadProfiles();
        break;

      case "run":
        await this._handleRun(
          String(m["profileId"] ?? ""),
          String(m["prompt"] ?? ""),
        );
        break;

      case "stream":
        await this._handleStream(
          String(m["profileId"] ?? ""),
          String(m["prompt"] ?? ""),
        );
        break;

      case "abort":
        this.currentAbort?.abort();
        break;

      default:
        break;
    }
  }

  private async _loadProfiles(): Promise<void> {
    try {
      const [profiles, models] = await Promise.all([
        fetchLlmExecutionProfiles(),
        fetchLlmModels(),
      ]);
      const modelMap = new Map(models.map((m) => [m.id, m.name]));
      const items = profiles.map((p) => ({
        ...p,
        modelName: modelMap.get(p.model_id) ?? p.model_id,
      }));
      void this.panel?.webview.postMessage({ type: "profiles", items });
    } catch (e) {
      this.extensionChannel.error("InferencePanelController: loadProfiles failed", String(e));
      void this.panel?.webview.postMessage({
        type: "error",
        message: `Failed to load profiles: ${String(e)}`,
      });
    }
  }

  private async _handleRun(profileId: string, prompt: string): Promise<void> {
    this._cancelInflight();
    const abort = new AbortController();
    this.currentAbort = abort;

    void this.panel?.webview.postMessage({ type: "runStart" });

    try {
      const response = await runInference(
        {
          execution_profile_id: profileId,
          messages: [{ role: "user", content: prompt }],
        },
        abort.signal,
      );
      void this.panel?.webview.postMessage({ type: "runResult", response });
    } catch (e) {
      if (_isAbortError(e)) {
        void this.panel?.webview.postMessage({ type: "runAborted" });
      } else {
        this.extensionChannel.error("InferencePanelController: run failed", String(e));
        void this.panel?.webview.postMessage({
          type: "error",
          message: String(e),
        });
      }
    } finally {
      if (this.currentAbort === abort) {
        this.currentAbort = undefined;
      }
    }
  }

  private async _handleStream(profileId: string, prompt: string): Promise<void> {
    this._cancelInflight();
    const abort = new AbortController();
    this.currentAbort = abort;

    void this.panel?.webview.postMessage({ type: "streamStart" });

    try {
      const gen = streamInference(
        {
          execution_profile_id: profileId,
          messages: [{ role: "user", content: prompt }],
        },
        abort.signal,
        {
          onParseError: (raw, err) => {
            this.extensionChannel.warn(
              "InferencePanelController: SSE parse error",
              raw,
              String(err),
            );
          },
        },
      );

      for await (const chunk of gen) {
        const typedChunk = chunk as LLMInferenceStreamChunk;
        void this.panel?.webview.postMessage({ type: "streamChunk", chunk: typedChunk });
        if (typedChunk.done) {
          break;
        }
      }
    } catch (e) {
      if (_isAbortError(e)) {
        void this.panel?.webview.postMessage({ type: "streamAborted" });
      } else {
        this.extensionChannel.error("InferencePanelController: stream failed", String(e));
        void this.panel?.webview.postMessage({
          type: "error",
          message: String(e),
        });
      }
    } finally {
      if (this.currentAbort === abort) {
        this.currentAbort = undefined;
      }
    }
  }

  dispose(): void {
    this._cancelInflight();
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

function _isAbortError(e: unknown): boolean {
  if (e instanceof Error) {
    return e.name === "AbortError";
  }
  return false;
}
