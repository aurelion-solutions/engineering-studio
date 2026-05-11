/**
 * platformClient fetchPipelineRunDetail tests.
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

type RunDetailModule = {
  fetchPipelineRunDetail: (runId: string) => Promise<Record<string, unknown>>;
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

const runId = "aaaa-1111-bbbb-2222";

const exampleDetail = {
  id: runId,
  pipeline_name: "my-pipeline",
  pipeline_version: 1,
  content_hash: "abc",
  status: "completed",
  trigger_source: "manual",
  current_step: null,
  started_at: "2026-05-11T10:00:00Z",
  finished_at: "2026-05-11T10:01:00Z",
  error: null,
  created_at: "2026-05-11T09:59:00Z",
  updated_at: "2026-05-11T10:01:00Z",
  args: { env: "prod" },
  steps: [
    {
      id: "step-1",
      step_name: "fetch-data",
      attempt: 1,
      status: "completed",
      started_at: "2026-05-11T10:00:01Z",
      finished_at: "2026-05-11T10:00:55Z",
      error: null,
    },
  ],
};

describe("fetchPipelineRunDetail", () => {
  beforeEach(() => { installVscodeMock(); });
  afterEach(() => { restoreFetch(); uninstallVscodeMock(); clearModuleCache(); });

  it("fetchPipelineRunDetail_sends_GET_to_correct_path", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineRunDetail } = require(CLIENT_PATH) as RunDetailModule;
    await fetchPipelineRunDetail(runId);

    assert.ok(
      lastFetchUrl?.endsWith(`/api/v0/pipeline-runs/${runId}`),
      `Expected URL to end with /api/v0/pipeline-runs/${runId}, got: ${lastFetchUrl}`,
    );
    assert.equal(lastFetchInit, undefined, "GET should not pass init");
  });

  it("fetchPipelineRunDetail_returns_parsed_detail", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineRunDetail } = require(CLIENT_PATH) as RunDetailModule;
    const result = await fetchPipelineRunDetail(runId);

    assert.equal(result["id"], runId);
    assert.equal(result["pipeline_name"], "my-pipeline");
    assert.ok(Array.isArray(result["steps"]), "steps should be an array");
    assert.equal((result["steps"] as unknown[]).length, 1);
  });

  it("fetchPipelineRunDetail_surfaces_detail_on_404", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "Pipeline run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineRunDetail } = require(CLIENT_PATH) as RunDetailModule;
    await assert.rejects(
      () => fetchPipelineRunDetail(runId),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("404"));
        assert.ok(err.message.includes("Pipeline run not found"));
        return true;
      },
    );
  });
});
