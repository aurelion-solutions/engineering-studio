/**
 * Network fetcher for the live pipeline schema.
 * No vscode import. No top-level side effects.
 * Returns a discriminated union — never throws.
 */
import { fetchPipelineSchema } from "../../../api/platformClient";

export type FailureReason =
  | "empty_apiBaseUrl"
  | "timeout"
  | "network"
  | "malformed_json"
  | `status_${number}`;

export type FetchResult =
  | { ok: true; schema: unknown; sizeBytes: number }
  | { ok: false; reason: FailureReason };

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Fetch the merged pipeline schema from the kernel.
 *
 * @param apiBaseUrl  Base URL of the kernel (e.g. "http://localhost:8000").
 *                    Empty / whitespace → returns empty_apiBaseUrl immediately.
 * @param deps        DI seam: inject a stub `client` in tests to avoid patching globals.
 */
export async function fetchLivePipelineSchema(
  apiBaseUrl: string,
  deps?: {
    client?: (signal?: AbortSignal) => Promise<unknown>;
    timeoutMs?: number;
  },
): Promise<FetchResult> {
  if (apiBaseUrl.trim() === "") {
    return { ok: false, reason: "empty_apiBaseUrl" };
  }

  const timeoutMs = deps?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const client = deps?.client ?? fetchPipelineSchema;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const raw = await client(controller.signal);

    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, reason: "malformed_json" };
    }

    const sizeBytes = JSON.stringify(raw).length;
    return { ok: true, schema: raw, sizeBytes };
  } catch (err: unknown) {
    // AbortError means our timeout fired
    if (
      err instanceof Error &&
      (err.name === "AbortError" || controller.signal.aborted)
    ) {
      return { ok: false, reason: "timeout" };
    }
    // HTTP errors from platformClient include status in the message
    if (err instanceof Error && /\((\d{3})\)/.test(err.message)) {
      const match = err.message.match(/\((\d{3})\)/);
      if (match !== null) {
        const status = parseInt(match[1], 10);
        return { ok: false, reason: `status_${status}` };
      }
    }
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
