import * as vscode from "vscode";
import { LogBuffer } from "./buffers";
import { buildLogUriParts, parseAppIdFromQuery } from "./uri";

type BufferEntry = {
  buffer: LogBuffer;
  uri: vscode.Uri;
};

/**
 * TextDocumentContentProvider for the aurelion-logs: scheme.
 *
 * Lifecycle:
 * - Instantiated once in extension.ts activate().
 * - Registered via vscode.workspace.registerTextDocumentContentProvider.
 * - Disposed through context.subscriptions.
 *
 * Threading model:
 * - VS Code extension host is single-threaded — no concurrent mutation.
 * - provideTextDocumentContent is pure read; append mutates then fires event.
 */
export class LogDocumentContentProvider
  implements vscode.TextDocumentContentProvider, vscode.Disposable
{
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange: vscode.Event<vscode.Uri> = this.emitter.event;
  private readonly entries = new Map<string, BufferEntry>();

  /**
   * Builds (or returns cached) vscode.Uri for an application.
   * The URI is stored in the entry map so onDidChange can fire the correct URI.
   */
  buildUri(app: { id: string; name: string }): vscode.Uri {
    const existing = this.entries.get(app.id);
    if (existing !== undefined) {
      return existing.uri;
    }
    const parts = buildLogUriParts(app);
    const uri = vscode.Uri.from({
      scheme: parts.scheme,
      path: parts.path,
      query: parts.query,
    });
    this.entries.set(app.id, { buffer: new LogBuffer(), uri });
    return uri;
  }

  /**
   * Appends a batch of formatted log lines to the buffer for the given appId and fires onDidChange once.
   * If no entry exists yet (append before buildUri — G4-style edge case),
   * a fallback URI is built using appId as the name.
   *
   * The emitter fires exactly once per call regardless of how many lines are in the batch.
   */
  append(appId: string, lines: readonly string[]): void {
    let entry = this.entries.get(appId);
    if (entry === undefined) {
      const parts = buildLogUriParts({ id: appId, name: appId });
      const uri = vscode.Uri.from({
        scheme: parts.scheme,
        path: parts.path,
        query: parts.query,
      });
      entry = { buffer: new LogBuffer(), uri };
      this.entries.set(appId, entry);
    }
    entry.buffer.append(lines);
    this.emitter.fire(entry.uri);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    const appId = parseAppIdFromQuery(uri.query);
    if (appId === undefined) {
      return "(no logs yet)";
    }
    const entry = this.entries.get(appId);
    if (entry === undefined) {
      return "(no logs yet)";
    }
    const rendered = entry.buffer.render();
    return rendered.length > 0 ? rendered : "(no logs yet)";
  }

  dispose(): void {
    this.emitter.dispose();
    this.entries.clear();
  }
}
