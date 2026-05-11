/**
 * Tests for fetchPipelines() and triggerPipelineRun() in platformClient.
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

type PipelinesTriggerModule = {
  fetchPipelines: () => Promise<unknown[]>;
  triggerPipelineRun: (req: {
    pipeline_name: string;
    args?: Record<string, unknown>;
  }) => Promise<{ pipeline_run_id: string; status: string; pipeline_version: number; created: boolean }>;
  TriggerPipelineRunError: new (status: number, detail: string) => Error & { status: number; detail: string };
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

describe("fetchPipelines", () => {
  beforeEach(() => {
    installVscodeMock();
  });
  afterEach(() => {
    restoreFetch();
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("calls GET /api/v0/pipelines and returns JSON list", async () => {
    const fakeList = [
      { name: "pipe-a", version: 1, schema_version: 1, description: null, step_count: 0, triggers: [] },
      { name: "pipe-b", version: 2, schema_version: 1, description: "desc", step_count: 1, triggers: [{ type: "manual" }] },
    ];
    let capturedUrl = "";
    stubFetch(async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify(fakeList), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelines } = require(CLIENT_PATH) as PipelinesTriggerModule;
    const result = await fetchPipelines();
    assert.ok(capturedUrl.endsWith("/api/v0/pipelines"), `URL should end with /api/v0/pipelines, got: ${capturedUrl}`);
    assert.equal(result.length, 2);
    assert.deepEqual(result, fakeList);
  });

  it("throws on non-ok response", async () => {
    stubFetch(async () => new Response("Not Found", { status: 404 }));

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchPipelines } = require(CLIENT_PATH) as PipelinesTriggerModule;
    await assert.rejects(
      () => fetchPipelines(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("404"));
        return true;
      },
    );
  });
});

describe("triggerPipelineRun", () => {
  beforeEach(() => {
    installVscodeMock();
  });
  afterEach(() => {
    restoreFetch();
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("POSTs to /api/v0/pipeline-runs with JSON body and Content-Type header, returns body on 201", async () => {
    const fakeResponse = {
      pipeline_run_id: "run-abc-123",
      status: "pending",
      pipeline_version: 1,
      created: true,
    };
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedContentType = "";
    let capturedBody = "";
    stubFetch(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = (init as RequestInit)?.method ?? "";
      capturedContentType = ((init as RequestInit)?.headers as Record<string, string>)?.["Content-Type"] ?? "";
      capturedBody = String((init as RequestInit)?.body ?? "");
      return new Response(JSON.stringify(fakeResponse), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { triggerPipelineRun } = require(CLIENT_PATH) as PipelinesTriggerModule;
    const result = await triggerPipelineRun({ pipeline_name: "pipe-a", args: { key: "val" } });
    assert.ok(capturedUrl.endsWith("/api/v0/pipeline-runs"), `URL should end with /api/v0/pipeline-runs, got: ${capturedUrl}`);
    assert.equal(capturedMethod, "POST");
    assert.equal(capturedContentType, "application/json");
    assert.ok(capturedBody.includes("pipe-a"), "body should contain pipeline name");
    assert.deepEqual(result, fakeResponse);
  });

  it("returns body on 200 (idempotent re-hit) without throwing", async () => {
    const fakeResponse = {
      pipeline_run_id: "run-existing",
      status: "running",
      pipeline_version: 1,
      created: false,
    };
    stubFetch(async () =>
      new Response(JSON.stringify(fakeResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { triggerPipelineRun } = require(CLIENT_PATH) as PipelinesTriggerModule;
    const result = await triggerPipelineRun({ pipeline_name: "pipe-a" });
    assert.deepEqual(result, fakeResponse);
  });

  it("throws TriggerPipelineRunError with status 422 and detail on 422 response", async () => {
    const body = { detail: "pipeline 'bad-pipe' not found" };
    stubFetch(async () =>
      new Response(JSON.stringify(body), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { triggerPipelineRun, TriggerPipelineRunError } = require(CLIENT_PATH) as PipelinesTriggerModule;
    await assert.rejects(
      () => triggerPipelineRun({ pipeline_name: "bad-pipe" }),
      (err: unknown) => {
        assert.ok(err instanceof TriggerPipelineRunError);
        assert.equal((err as { status: number }).status, 422);
        assert.equal((err as { detail: string }).detail, "pipeline 'bad-pipe' not found");
        return true;
      },
    );
  });

  it("throws TriggerPipelineRunError with correct status on 404", async () => {
    const body = { detail: "not found" };
    stubFetch(async () =>
      new Response(JSON.stringify(body), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { triggerPipelineRun, TriggerPipelineRunError } = require(CLIENT_PATH) as PipelinesTriggerModule;
    await assert.rejects(
      () => triggerPipelineRun({ pipeline_name: "pipe-a" }),
      (err: unknown) => {
        assert.ok(err instanceof TriggerPipelineRunError);
        assert.equal((err as { status: number }).status, 404);
        return true;
      },
    );
  });

  it("throws TriggerPipelineRunError with correct status on 500", async () => {
    stubFetch(async () => new Response("Internal Server Error", { status: 500 }));

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { triggerPipelineRun, TriggerPipelineRunError } = require(CLIENT_PATH) as PipelinesTriggerModule;
    await assert.rejects(
      () => triggerPipelineRun({ pipeline_name: "pipe-a" }),
      (err: unknown) => {
        assert.ok(err instanceof TriggerPipelineRunError);
        assert.equal((err as { status: number }).status, 500);
        return true;
      },
    );
  });

  it("throws TriggerPipelineRunError with JSON.stringify detail when FastAPI returns detail as array (422 validation errors)", async () => {
    const fastapiDetail = [
      { loc: ["body", "args"], msg: "value is not a valid dict", type: "type_error.dict" },
      { loc: ["body", "pipeline_name"], msg: "field required", type: "value_error.missing" },
    ];
    const body = { detail: fastapiDetail };
    stubFetch(async () =>
      new Response(JSON.stringify(body), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { triggerPipelineRun, TriggerPipelineRunError } = require(CLIENT_PATH) as PipelinesTriggerModule;
    await assert.rejects(
      () => triggerPipelineRun({ pipeline_name: "pipe-a" }),
      (err: unknown) => {
        assert.ok(err instanceof TriggerPipelineRunError);
        assert.equal((err as { status: number }).status, 422);
        const detail = (err as { detail: string }).detail;
        // detail must be a JSON.stringify'd representation of the array, not "Unprocessable Entity"
        assert.notEqual(detail, "Unprocessable Entity");
        const parsed: unknown = JSON.parse(detail);
        assert.ok(Array.isArray(parsed), "detail should be JSON-parseable array");
        assert.equal((parsed as unknown[]).length, 2);
        return true;
      },
    );
  });
});
