/**
 * platformClient fetchPipelineDetail tests.
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

type DetailModule = {
  fetchPipelineDetail: (name: string) => Promise<Record<string, unknown>>;
};

// ─── Fetch stub ────────────────────────────────────────────────────────────────

type FetchFn = typeof globalThis.fetch;
let originalFetch: FetchFn | undefined;
let lastFetchUrl: string | undefined;

function stubFetch(fn: FetchFn): void {
  originalFetch = globalThis.fetch;
  lastFetchUrl = undefined;
  globalThis.fetch = async (input: Parameters<FetchFn>[0], init?: RequestInit) => {
    lastFetchUrl = String(input);
    return fn(input, init);
  };
}

function restoreFetch(): void {
  if (originalFetch !== undefined) {
    globalThis.fetch = originalFetch;
    originalFetch = undefined;
  }
}

// ─── Test data ────────────────────────────────────────────────────────────────

const exampleDetail = {
  name: "my-pipeline",
  version: 1,
  schema_version: 1,
  description: "Test pipeline",
  step_count: 2,
  triggers: [{ type: "manual" }],
  args_schema: {},
  steps: [
    { name: "step-1", engine: "inventory_reconcile", action: "run" },
  ],
  content_hash: "abc123",
  source_path: "/pipelines/my-pipeline.yaml",
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("fetchPipelineDetail", () => {
  beforeEach(() => { installVscodeMock(); });
  afterEach(() => { restoreFetch(); uninstallVscodeMock(); clearModuleCache(); });

  it("200_returns_typed_PipelineDetailFromApi", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineDetail } = require(CLIENT_PATH) as DetailModule;
    const result = await fetchPipelineDetail("my-pipeline");

    assert.equal(result["name"], "my-pipeline");
    assert.equal(result["version"], 1);
    assert.equal(result["content_hash"], "abc123");
    assert.ok(Array.isArray(result["triggers"]));
    assert.ok(Array.isArray(result["steps"]));
  });

  it("404_throws_with_detail_message", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "Pipeline not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineDetail } = require(CLIENT_PATH) as DetailModule;
    await assert.rejects(
      () => fetchPipelineDetail("missing-pipeline"),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("404"));
        assert.ok(err.message.includes("Pipeline not found"));
        return true;
      },
    );
  });

  it("non_ok_response_throws", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineDetail } = require(CLIENT_PATH) as DetailModule;
    await assert.rejects(
      () => fetchPipelineDetail("broken-pipeline"),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("500"));
        return true;
      },
    );
  });

  it("name_with_slash_is_percent_encoded_in_url", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineDetail } = require(CLIENT_PATH) as DetailModule;
    await fetchPipelineDetail("scope/my-pipeline");

    assert.ok(
      lastFetchUrl?.includes("scope%2Fmy-pipeline"),
      `Expected URL to contain encoded slash, got: ${lastFetchUrl}`,
    );
  });

  it("name_with_space_is_percent_encoded_in_url", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify(exampleDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineDetail } = require(CLIENT_PATH) as DetailModule;
    await fetchPipelineDetail("my pipeline");

    assert.ok(
      lastFetchUrl?.includes("my%20pipeline"),
      `Expected URL to contain encoded space, got: ${lastFetchUrl}`,
    );
  });
});
