/**
 * platformClient inference method tests.
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

type InferenceModule = {
  runInference: (
    req: { execution_profile: string; messages: unknown[] },
    signal?: AbortSignal,
  ) => Promise<{ output: string; model: string; tokens_used: number; latency_ms: number }>;
  streamInference: (
    req: { execution_profile: string; messages: unknown[] },
    signal: AbortSignal,
    options?: { onParseError?: (raw: string, err: unknown) => void },
  ) => AsyncGenerator<unknown>;
};

// ─── Fetch stub ────────────────────────────────────────────────────────────────

type FetchFn = typeof globalThis.fetch;
let originalFetch: FetchFn | undefined;

function stubFetch(fn: FetchFn): void {
  originalFetch = globalThis.fetch;
  globalThis.fetch = fn;
}

function restoreFetch(): void {
  if (originalFetch !== undefined) {
    globalThis.fetch = originalFetch;
    originalFetch = undefined;
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("runInference", () => {
  beforeEach(() => {
    installVscodeMock();
  });
  afterEach(() => {
    restoreFetch();
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("parses ok response", async () => {
    const expected = {
      output: "Hello world",
      model: "gpt-test",
      tokens_used: 42,
      latency_ms: 120,
    };
    stubFetch(async () =>
      new Response(JSON.stringify(expected), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { runInference } = require(CLIENT_PATH) as InferenceModule;
    const result = await runInference({
      execution_profile: "default",
      messages: [{ role: "user", content: "hi" }],
    });
    assert.deepEqual(result, expected);
  });

  it("throws on non-ok response with status in message", async () => {
    stubFetch(async () => new Response("Internal Server Error", { status: 500 }));

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { runInference } = require(CLIENT_PATH) as InferenceModule;
    await assert.rejects(
      () =>
        runInference({
          execution_profile: "default",
          messages: [{ role: "user", content: "hi" }],
        }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("500"));
        return true;
      },
    );
  });
});

describe("streamInference", () => {
  beforeEach(() => {
    installVscodeMock();
  });
  afterEach(() => {
    restoreFetch();
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("yields chunks and completes on done:true", async () => {
    const sseBody = [
      'data: {"token":"Hello","done":false}\n\n',
      'data: {"output":"Hello","model":"m","tokens_used":5,"latency_ms":50,"done":true}\n\n',
    ].join("");

    stubFetch(async () =>
      new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { streamInference } = require(CLIENT_PATH) as InferenceModule;
    const abort = new AbortController();
    const chunks: unknown[] = [];
    for await (const chunk of streamInference(
      { execution_profile: "default", messages: [{ role: "user", content: "hi" }] },
      abort.signal,
    )) {
      chunks.push(chunk);
    }
    assert.equal(chunks.length, 2);
    const last = chunks[1] as Record<string, unknown>;
    assert.equal(last["done"], true);
    assert.equal(last["output"], "Hello");
  });

  it("throws before first chunk on non-ok response", async () => {
    stubFetch(async () => new Response("Bad Gateway", { status: 502 }));

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { streamInference } = require(CLIENT_PATH) as InferenceModule;
    const abort = new AbortController();
    await assert.rejects(
      async () => {
        for await (const _ of streamInference(
          { execution_profile: "default", messages: [{ role: "user", content: "hi" }] },
          abort.signal,
        )) {
          // noop
          void _;
        }
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("502"));
        return true;
      },
    );
  });
});
