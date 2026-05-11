/**
 * Unit tests for fetchLivePipelineSchema.
 * Uses DI seam (deps.client) and Module._load vscode shim to avoid
 * the transitive vscode requirement from platformClient.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";

// ─── vscode shim (needed because liveSchemaFetcher imports platformClient) ────

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

// ─── Load module under shim ────────────────────────────────────────────────────

type FetchLiveFn = (
  apiBaseUrl: string,
  deps?: { client?: (signal?: AbortSignal) => Promise<unknown>; timeoutMs?: number },
) => Promise<{ ok: true; schema: unknown; sizeBytes: number } | { ok: false; reason: string }>;

const FETCHER_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "out",
  "integrations",
  "pipelines",
  "schema",
  "liveSchemaFetcher.js",
);

type RequireWithCache = typeof require & { cache: Record<string, unknown> };

function clearFetcherCache(): void {
  const cache = (require as unknown as RequireWithCache).cache;
  delete cache[FETCHER_PATH];
}

let fetchLivePipelineSchema: FetchLiveFn;

before(() => {
  installVscodeMock();
  clearFetcherCache();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(FETCHER_PATH) as { fetchLivePipelineSchema: FetchLiveFn };
  fetchLivePipelineSchema = mod.fetchLivePipelineSchema;
});

after(() => {
  uninstallVscodeMock();
  clearFetcherCache();
});

/** Build a minimal client stub that returns a resolved promise. */
function makeClient(fn: (signal?: AbortSignal) => Promise<unknown>) {
  return fn;
}

describe("fetchLivePipelineSchema", () => {
  it("ok_200_json_object_returns_ok_true_with_sizeBytes", async () => {
    const schema = { $schema: "http://json-schema.org/draft-07/schema#", type: "object" };
    let callCount = 0;
    const client = makeClient(async () => {
      callCount++;
      return schema;
    });
    const result = await fetchLivePipelineSchema("http://localhost:8000", { client });
    assert.ok(result.ok);
    if (result.ok) {
      assert.deepEqual(result.schema, schema);
      assert.ok(result.sizeBytes > 0, "sizeBytes should be > 0");
    }
    assert.equal(callCount, 1);
  });

  it("empty_apiBaseUrl_returns_empty_apiBaseUrl_without_calling_client", async () => {
    let callCount = 0;
    const client = makeClient(async () => {
      callCount++;
      return {};
    });
    const result = await fetchLivePipelineSchema("   ", { client });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.equal(result.reason, "empty_apiBaseUrl");
    }
    assert.equal(callCount, 0, "client must not be called for empty apiBaseUrl");
  });

  it("non2xx_500_returns_status_500", async () => {
    const client = makeClient(async () => {
      throw new Error("Pipeline schema request failed (500): Internal Server Error");
    });
    const result = await fetchLivePipelineSchema("http://localhost:8000", { client });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.equal(result.reason, "status_500");
    }
  });

  it("non2xx_404_returns_status_404", async () => {
    const client = makeClient(async () => {
      throw new Error("Pipeline schema request failed (404): Not Found");
    });
    const result = await fetchLivePipelineSchema("http://localhost:8000", { client });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.equal(result.reason, "status_404");
    }
  });

  it("non2xx_503_returns_status_503", async () => {
    const client = makeClient(async () => {
      throw new Error("Pipeline schema request failed (503): Service Unavailable");
    });
    const result = await fetchLivePipelineSchema("http://localhost:8000", { client });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.equal(result.reason, "status_503");
    }
  });

  it("200_html_body_returns_malformed_json", async () => {
    const client = makeClient(async () => "<html>Not JSON</html>");
    const result = await fetchLivePipelineSchema("http://localhost:8000", { client });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.equal(result.reason, "malformed_json");
    }
  });

  it("fetch_throws_TypeError_returns_network", async () => {
    const client = makeClient(async () => {
      throw new TypeError("Failed to fetch");
    });
    const result = await fetchLivePipelineSchema("http://localhost:8000", { client });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.equal(result.reason, "network");
    }
  });

  it("pre_aborted_signal_returns_timeout", async () => {
    // Client never resolves on its own — it waits for the abort signal.
    // This makes the timeout deterministic: 1ms timer fires, controller aborts,
    // client promise rejects with AbortError, fetcher returns { ok: false, reason: "timeout" }.
    const client = makeClient(
      (signal?: AbortSignal) =>
        new Promise<unknown>((_resolve, reject) => {
          if (signal === undefined) {
            return;
          }
          if (signal.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
          signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );

    const result = await fetchLivePipelineSchema("http://localhost:8000", {
      client,
      timeoutMs: 1,
    });

    assert.ok(!result.ok, `expected ok=false, got ${JSON.stringify(result)}`);
    if (!result.ok) {
      assert.equal(result.reason, "timeout");
    }
  });

  it("every_branch_wrapped_no_throws", async () => {
    const scenarios: Array<() => Promise<unknown>> = [
      () => fetchLivePipelineSchema("", {}),
      () =>
        fetchLivePipelineSchema("http://localhost:8000", {
          client: async () => {
            throw new TypeError("net error");
          },
        }),
      () =>
        fetchLivePipelineSchema("http://localhost:8000", {
          client: async () => {
            throw new Error("Pipeline schema request failed (500): oops");
          },
        }),
      () =>
        fetchLivePipelineSchema("http://localhost:8000", {
          client: async () => null,
        }),
    ];
    for (const fn of scenarios) {
      await assert.doesNotReject(fn);
    }
  });
});
