/**
 * platformClient cancel/retry method tests.
 * Uses Module._load to stub vscode before requiring the client module.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";

// ─── Module load intercept ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeModule = require("node:module") as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
type LoadFn = (request: string, parent: unknown, isMain: boolean) => unknown;

const vscodeMock = {
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue,
    }),
  },
};

let originalLoad: LoadFn | undefined;

function installVscodeMock(): void {
  originalLoad = NodeModule._load;
  NodeModule._load = function (
    request: string,
    parent: unknown,
    isMain: boolean,
  ): unknown {
    if (request === "vscode") {
      return vscodeMock;
    }
    return originalLoad!(request, parent, isMain);
  };
}

function uninstallVscodeMock(): void {
  if (originalLoad !== undefined) {
    NodeModule._load = originalLoad;
    originalLoad = undefined;
  }
}

// ─── Module paths ──────────────────────────────────────────────────────────────

const CLIENT_PATH = path.resolve(__dirname, "..", "platformClient.js");
const SSE_PARSER_PATH = path.resolve(__dirname, "..", "sseParser.js");

type RequireWithCache = typeof require & { cache: Record<string, unknown> };

function clearModuleCache(): void {
  const cache = (require as unknown as RequireWithCache).cache;
  delete cache[CLIENT_PATH];
  delete cache[SSE_PARSER_PATH];
}

type CancelRetryModule = {
  cancelPipelineRun: (runId: string) => Promise<{ run_id: string; status: string }>;
  retryPipelineRun: (runId: string) => Promise<{ run_id: string; retry_of_run_id: string; status: string; pipeline_name: string; pipeline_version: number }>;
};

// ─── Fetch stub ────────────────────────────────────────────────────────────────

type FetchFn = typeof globalThis.fetch;
let originalFetch: FetchFn | undefined;
let lastFetchUrl: string | undefined;
let lastFetchInit: RequestInit | undefined;

function stubFetch(fn: FetchFn): void {
  originalFetch = globalThis.fetch;
  lastFetchUrl = undefined;
  lastFetchInit = undefined;
  globalThis.fetch = async (input: Parameters<FetchFn>[0], init?: RequestInit) => {
    lastFetchUrl = String(input);
    lastFetchInit = init;
    return fn(input, init);
  };
}

function restoreFetch(): void {
  if (originalFetch !== undefined) {
    globalThis.fetch = originalFetch;
    originalFetch = undefined;
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("cancelPipelineRun", () => {
  beforeEach(() => { installVscodeMock(); });
  afterEach(() => { restoreFetch(); uninstallVscodeMock(); clearModuleCache(); });

  it("cancelPipelineRun_sends_POST_to_cancel_path", async () => {
    const runId = "aaaa-bbbb-cccc-dddd";
    stubFetch(async () =>
      new Response(JSON.stringify({ run_id: runId, status: "cancelled" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cancelPipelineRun } = require(CLIENT_PATH) as CancelRetryModule;
    const res = await cancelPipelineRun(runId);

    assert.ok(lastFetchUrl?.endsWith(`/api/v0/pipeline-runs/${runId}/cancel`));
    assert.equal(lastFetchInit?.method, "POST");
    assert.equal(res.status, "cancelled");
  });

  it("cancelPipelineRun_surfaces_detail_on_409", async () => {
    const runId = "aaaa-bbbb-cccc-dddd";
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "Run is already cancelling" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cancelPipelineRun } = require(CLIENT_PATH) as CancelRetryModule;
    await assert.rejects(
      () => cancelPipelineRun(runId),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("409"));
        assert.ok(err.message.includes("Run is already cancelling"));
        return true;
      },
    );
  });
});

describe("retryPipelineRun", () => {
  beforeEach(() => { installVscodeMock(); });
  afterEach(() => { restoreFetch(); uninstallVscodeMock(); clearModuleCache(); });

  it("retryPipelineRun_sends_POST_to_retry_path", async () => {
    const runId = "eeee-ffff-gggg-hhhh";
    stubFetch(async () =>
      new Response(JSON.stringify({
        run_id: "new-run-id",
        retry_of_run_id: runId,
        status: "pending",
        pipeline_name: "my-pipeline",
        pipeline_version: 1,
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { retryPipelineRun } = require(CLIENT_PATH) as CancelRetryModule;
    const res = await retryPipelineRun(runId);

    assert.ok(lastFetchUrl?.endsWith(`/api/v0/pipeline-runs/${runId}/retry`));
    assert.equal(lastFetchInit?.method, "POST");
    assert.equal(res.retry_of_run_id, runId);
  });

  it("retryPipelineRun_surfaces_detail_on_404", async () => {
    const runId = "eeee-ffff-gggg-hhhh";
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { retryPipelineRun } = require(CLIENT_PATH) as CancelRetryModule;
    await assert.rejects(
      () => retryPipelineRun(runId),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("404"));
        assert.ok(err.message.includes("Run not found"));
        return true;
      },
    );
  });
});
