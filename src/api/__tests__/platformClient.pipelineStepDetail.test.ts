/**
 * platformClient fetchPipelineStepDetail tests.
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

type StepDetailModule = {
  fetchPipelineStepDetail: (runId: string, stepName: string) => Promise<Record<string, unknown>>;
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
const stepName = "fetch-data";

const exampleStepDetail = {
  id: "step-uuid-1",
  step_name: stepName,
  attempt: 1,
  status: "completed",
  started_at: "2026-05-11T10:00:01Z",
  finished_at: "2026-05-11T10:00:55Z",
  error: null,
  args: { env: "prod" },
  result: { count: 42 },
};

describe("fetchPipelineStepDetail", () => {
  beforeEach(() => { installVscodeMock(); });
  afterEach(() => { restoreFetch(); uninstallVscodeMock(); clearModuleCache(); });

  it("fetchPipelineStepDetail_sends_GET_to_correct_path", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleStepDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineStepDetail } = require(CLIENT_PATH) as StepDetailModule;
    await fetchPipelineStepDetail(runId, stepName);

    const expectedSuffix = `/api/v0/pipeline-runs/${runId}/steps/${stepName}`;
    assert.ok(
      lastFetchUrl?.endsWith(expectedSuffix),
      `Expected URL to end with ${expectedSuffix}, got: ${lastFetchUrl}`,
    );
    assert.equal(lastFetchInit, undefined, "GET should not pass init");
  });

  it("fetchPipelineStepDetail_url_encodes_step_name", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleStepDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineStepDetail } = require(CLIENT_PATH) as StepDetailModule;
    await fetchPipelineStepDetail(runId, "step/with space");

    assert.ok(
      lastFetchUrl?.includes("step%2Fwith%20space"),
      `Expected percent-encoded step name in URL, got: ${lastFetchUrl}`,
    );
  });

  it("fetchPipelineStepDetail_url_encodes_run_id", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleStepDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineStepDetail } = require(CLIENT_PATH) as StepDetailModule;
    await fetchPipelineStepDetail("run/id with space", stepName);

    assert.ok(
      lastFetchUrl?.includes("run%2Fid%20with%20space"),
      `Expected percent-encoded run id in URL, got: ${lastFetchUrl}`,
    );
  });

  it("fetchPipelineStepDetail_returns_parsed_detail", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleStepDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineStepDetail } = require(CLIENT_PATH) as StepDetailModule;
    const result = await fetchPipelineStepDetail(runId, stepName);

    assert.equal(result["id"], "step-uuid-1");
    assert.equal(result["step_name"], stepName);
    assert.deepEqual(result["args"], { env: "prod" });
    assert.deepEqual(result["result"], { count: 42 });

    // null result variant
    stubFetch(async () =>
      new Response(JSON.stringify({ ...exampleStepDetail, result: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod2 = require(CLIENT_PATH) as StepDetailModule;
    const result2 = await mod2.fetchPipelineStepDetail(runId, stepName);
    assert.equal(result2["result"], null);
  });

  it("fetchPipelineStepDetail_surfaces_detail_on_404_run_missing", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "Pipeline run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineStepDetail } = require(CLIENT_PATH) as StepDetailModule;
    await assert.rejects(
      () => fetchPipelineStepDetail(runId, stepName),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("404"));
        assert.ok(err.message.includes("Pipeline run not found"));
        return true;
      },
    );
  });

  it("fetchPipelineStepDetail_surfaces_detail_on_404_step_missing", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: `Step '${stepName}' not found in run ${runId}` }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineStepDetail } = require(CLIENT_PATH) as StepDetailModule;
    await assert.rejects(
      () => fetchPipelineStepDetail(runId, stepName),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("404"));
        assert.ok(err.message.includes(`Step '${stepName}' not found in run ${runId}`));
        return true;
      },
    );
  });
});
