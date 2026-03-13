import * as vscode from "vscode";
import {
  fetchLogBufferEvents,
  type FetchLogBufferParams,
} from "../../api/platformClient";
import type { LogBufferEvent } from "../../api/types";
import { formatLogLine, buildSyntheticLogEvent } from "./formatLogLine";
import type { LogDocumentContentProvider } from "./contentProvider";
import { computeNextNewestTs } from "./streamerUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppEntry = {
  appId: string;
  appName: string;
  newestTs: string | undefined;
  enabled: boolean;
  consecutiveFailures: number;
};

type FetchFn = (params: FetchLogBufferParams) => Promise<LogBufferEvent[]>;

type LogStreamerOptions = {
  provider: LogDocumentContentProvider;
  extensionChannel: vscode.LogOutputChannel;
  pollMsProvider: () => number;
  /** Dependency injection for tests. Defaults to the real fetchLogBufferEvents. */
  fetch?: FetchFn;
};

// ─── LogStreamer ──────────────────────────────────────────────────────────────

/**
 * Manages a single shared setInterval tick that polls log events for all enabled apps.
 *
 * Public API (G1):
 *   enable(app)           — start streaming for an app
 *   disable(appId)        — stop streaming (buffer + newestTs preserved)
 *   isEnabled(appId)      — check current state
 *   restartTick()         — restart the interval (called when pollMs config changes)
 *   resetAllNewestTs()    — reset cursors without touching enabled state (called on apiBaseUrl change)
 *   dispose()             — idempotent teardown
 */
export class LogStreamer implements vscode.Disposable {
  private readonly entries = new Map<string, AppEntry>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private inFlight = false;
  private disposed = false; // G7: flag to guard tickImpl after dispose
  private readonly fetchFn: FetchFn;

  constructor(private readonly opts: LogStreamerOptions) {
    this.fetchFn = opts.fetch ?? fetchLogBufferEvents;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  enable(app: { id: string; name: string }): void {
    if (this.disposed) {
      return;
    }

    const existing = this.entries.get(app.id);
    if (existing !== undefined) {
      existing.enabled = true;
    } else {
      this.entries.set(app.id, {
        appId: app.id,
        appName: app.name,
        newestTs: undefined,
        enabled: true,
        consecutiveFailures: 0,
      });
    }

    this.ensureTimerRunning();

    // G6: fire an immediate tick so seed history appears instantly (not after first pollMs delay)
    // inFlight guard in tickImpl ensures idempotency
    void this.tickImpl();
  }

  disable(appId: string): void {
    const entry = this.entries.get(appId);
    if (entry !== undefined) {
      entry.enabled = false;
    }
    this.stopTimerIfIdle();
  }

  isEnabled(appId: string): boolean {
    return this.entries.get(appId)?.enabled ?? false;
  }

  /**
   * Restart the shared interval — called when logStreamPollMs config changes (G1, G8).
   * Does not reset newestTs; streaming resumes from where it left off.
   */
  restartTick(): void {
    if (this.disposed) {
      return;
    }
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.ensureTimerRunning();
  }

  /**
   * Reset all newestTs cursors without changing enabled state (G1, G8).
   * Called from extension.ts when apiBaseUrl changes — new kernel instance means
   * old timestamps are meaningless and could block the seed path.
   */
  resetAllNewestTs(): void {
    for (const entry of this.entries.values()) {
      entry.newestTs = undefined;
    }
  }

  /**
   * Idempotent dispose (G7).
   * Clears the timer and entries. Early-return if already disposed.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.entries.clear();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private ensureTimerRunning(): void {
    if (this.timer !== undefined) {
      return;
    }
    const hasEnabled = [...this.entries.values()].some((e) => e.enabled);
    if (!hasEnabled) {
      return;
    }
    const pollMs = Math.max(500, this.opts.pollMsProvider());
    this.timer = setInterval(() => {
      void this.tickImpl();
    }, pollMs);
  }

  private stopTimerIfIdle(): void {
    const hasEnabled = [...this.entries.values()].some((e) => e.enabled);
    if (!hasEnabled && this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async tickImpl(): Promise<void> {
    // G7: early-return if disposed
    if (this.disposed) {
      return;
    }
    // Single shared inFlight guard prevents overlapping ticks
    if (this.inFlight) {
      return;
    }
    this.inFlight = true;

    try {
      // Snapshot enabled entries to avoid mutation during async iteration
      const snapshot = [...this.entries.values()].filter((e) => e.enabled);
      for (const entry of snapshot) {
        // G7: check disposed before each per-app poll
        if (this.disposed) {
          break;
        }
        await this.pollOne(entry);
      }
    } finally {
      this.inFlight = false;
    }
  }

  private async pollOne(entry: AppEntry): Promise<void> {
    // G7: early-return if disposed
    if (this.disposed) {
      return;
    }

    try {
      if (entry.newestTs === undefined) {
        // ─── Seed path ───────────────────────────────────────────────────────
        const seedBatch = await this.fetchFn({
          targetType: "application",
          targetId: entry.appId,
          order: "desc",
          limit: 50,
        });

        if (seedBatch.length === 0) {
          // G5: empty seed — set time-based cursor so next tick uses incremental path.
          // Without this the poller would loop in seed mode forever (newestTs stays undefined).
          entry.newestTs = new Date().toISOString();
        } else {
          // Reverse to chronological order (ASC) before feeding to buffer
          const chronological = [...seedBatch].reverse();
          for (const ev of chronological) {
            this.opts.provider.append(entry.appId, formatLogLine(ev));
          }
          entry.newestTs = computeNextNewestTs(undefined, seedBatch, "desc");
        }

        if (entry.consecutiveFailures > 0) {
          const ts = new Date().toISOString();
          const recoveryLines = formatLogLine(
            buildSyntheticLogEvent({
              level: "info",
              timestamp: ts,
              event_type: "log.stream.recovered",
              message: "Log stream recovered",
            }),
          );
          this.opts.provider.append(entry.appId, recoveryLines);
          entry.consecutiveFailures = 0;
        }
      } else {
        // ─── Incremental path ─────────────────────────────────────────────────
        const batch = await this.fetchFn({
          targetType: "application",
          targetId: entry.appId,
          order: "asc",
          fromTs: entry.newestTs,
          limit: 200,
        });

        if (batch.length > 0) {
          for (const ev of batch) {
            this.opts.provider.append(entry.appId, formatLogLine(ev));
          }
          entry.newestTs = computeNextNewestTs(entry.newestTs, batch, "asc");
        }

        if (entry.consecutiveFailures > 0) {
          const ts = new Date().toISOString();
          const recoveryLines = formatLogLine(
            buildSyntheticLogEvent({
              level: "info",
              timestamp: ts,
              event_type: "log.stream.recovered",
              message: "Log stream recovered",
            }),
          );
          this.opts.provider.append(entry.appId, recoveryLines);
          entry.consecutiveFailures = 0;
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (entry.consecutiveFailures === 0) {
        // Only log on first failure in a series to avoid flooding extension-channel
        this.opts.extensionChannel.error(
          `Log stream unreachable for "${entry.appName}" (${entry.appId}): ${msg}`,
        );
      }
      entry.consecutiveFailures += 1;
    }
  }
}
