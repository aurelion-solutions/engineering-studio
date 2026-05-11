/**
 * Tests for fetchPipelineSchema() in platformClient.
 * Uses Module._load to stub vscode; stubs global fetch per test.
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

const API_BASE = "http://localhost:8000";

const vscodeMock = {
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => {
        // Return our test API base URL instead of default
        if (_key === "apiBaseUrl") return API_BASE;
        return defaultValue;
      },
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

type PipelineSchemaModule = {
  fetchPipelineSchema: (signal?: AbortSignal) => Promise<unknown>;
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

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("fetchPipelineSchema", () => {
  beforeEach(() => { installVscodeMock(); });
  afterEach(() => { restoreFetch(); uninstallVscodeMock(); clearModuleCache(); });

  it("sends_GET_to_well_known_endpoint", async () => {
    const schema = { $schema: "http://json-schema.org/draft-07/schema#" };
    stubFetch(async () =>
      new Response(JSON.stringify(schema), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineSchema } = require(CLIENT_PATH) as PipelineSchemaModule;
    await fetchPipelineSchema();

    assert.ok(
      lastFetchUrl?.endsWith("/.well-known/pipeline-schema.json"),
      `Expected URL to end with /.well-known/pipeline-schema.json, got: ${lastFetchUrl}`,
    );
  });

  it("returns_parsed_json_on_200", async () => {
    const schema = { $schema: "http://json-schema.org/draft-07/schema#", type: "object" };
    stubFetch(async () =>
      new Response(JSON.stringify(schema), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineSchema } = require(CLIENT_PATH) as PipelineSchemaModule;
    const result = await fetchPipelineSchema();

    assert.deepEqual(result, schema);
  });

  it("throws_with_status_and_detail_on_500", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "Internal Server Error detail" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineSchema } = require(CLIENT_PATH) as PipelineSchemaModule;
    await assert.rejects(
      () => fetchPipelineSchema(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("500"), `message should contain 500: ${err.message}`);
        assert.ok(
          err.message.includes("Internal Server Error detail"),
          `message should contain detail: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("throws_with_404_in_message_on_404", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "schema not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineSchema } = require(CLIENT_PATH) as PipelineSchemaModule;
    await assert.rejects(
      () => fetchPipelineSchema(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("404"), `message should contain 404: ${err.message}`);
        return true;
      },
    );
  });

  it("rejects_with_AbortError_when_signal_pre_aborted", async () => {
    stubFetch(async (_input, init) => {
      const signal = (init as RequestInit | undefined)?.signal;
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      return new Response("{}", { status: 200 });
    });

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelineSchema } = require(CLIENT_PATH) as PipelineSchemaModule;

    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      () => fetchPipelineSchema(controller.signal),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal((err as DOMException).name, "AbortError");
        return true;
      },
    );
  });
});
