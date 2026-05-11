/**
 * Tests for yamlSchemaContributor.
 * Shims vscode + yaml extension via Module._load.
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

type RequireWithCache = typeof require & { cache: Record<string, unknown> };

const CONTRIBUTOR_PATH = path.resolve(
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
  "yamlSchemaContributor.js",
);

// The compiled LiveSchemaCache path for module cache clearing
const CACHE_PATH = path.resolve(
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
  "liveSchemaCache.js",
);

function clearModuleCache(): void {
  const cache = (require as unknown as RequireWithCache).cache;
  delete cache[CONTRIBUTOR_PATH];
  delete cache[CACHE_PATH];
}

// ─── Fake vscode + yaml ext shim ──────────────────────────────────────────────

/** Creates a fake vscode module with a controllable yaml extension. */
function makeVscodeMock(opts: {
  yamlExt?: unknown; // undefined = extension missing
}) {
  return {
    extensions: {
      getExtension: (id: string) => {
        if (id === "redhat.vscode-yaml") {
          return opts.yamlExt !== undefined
            ? {
                activate: async () => opts.yamlExt,
              }
            : undefined;
        }
        return undefined;
      },
    },
    window: {
      createOutputChannel: () => ({
        info: () => {},
        warn: () => {},
        error: () => {},
        dispose: () => {},
      }),
    },
  };
}

/** Minimal LogOutputChannel shim for tests. */
function makeChannel(captured: string[] = []) {
  return {
    info: (msg: string) => { captured.push(`INFO:${msg}`); },
    warn: (msg: string) => { captured.push(`WARN:${msg}`); },
    error: (msg: string) => { captured.push(`ERROR:${msg}`); },
    dispose: () => {},
  };
}

let originalLoad: LoadFn | undefined;

function installVscodeMock(vscodeStub: unknown): void {
  originalLoad = NodeModule._load;
  NodeModule._load = function (
    request: string,
    parent: unknown,
    isMain: boolean,
  ): unknown {
    if (request === "vscode") {
      return vscodeStub;
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

// ─── Type for the module ──────────────────────────────────────────────────────

interface LiveSchemaCacheIface {
  setLive(schema: unknown): void;
  clearLive(): void;
  hasLive(): boolean;
  getActiveSchema(bundled: unknown): unknown;
}

interface ContributorModule {
  VIRTUAL_URI: string;
  FILE_GLOB: RegExp;
  register(args: {
    cache: LiveSchemaCacheIface;
    bundled: unknown;
    extensionChannel: ReturnType<typeof makeChannel>;
  }): {
    notifyChanged(): void;
    dispose(): void;
  };
}

const VIRTUAL_URI = "aurelion-pipeline://merged/pipeline.schema.json";

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("yamlSchemaContributor — extension missing", () => {
  beforeEach(() => {
    installVscodeMock(makeVscodeMock({ yamlExt: undefined }));
  });
  afterEach(() => {
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("returns_noop_contributor_and_warns_yaml_extension_missing", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const logs: string[] = [];
    const channel = makeChannel(logs);
    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    const contributor = mod.register({ cache, bundled: {}, extensionChannel: channel as never });

    // Wait for async IIFE
    await new Promise((r) => setTimeout(r, 20));

    assert.ok(
      logs.some((l) => l.includes("yaml_extension_missing")),
      `expected yaml_extension_missing in logs, got: ${JSON.stringify(logs)}`,
    );

    // dispose must not throw
    assert.doesNotThrow(() => contributor.dispose());
    // notifyChanged must not throw
    assert.doesNotThrow(() => contributor.notifyChanged());
  });
});

describe("yamlSchemaContributor — activate returns non-object exports", () => {
  beforeEach(() => {
    installVscodeMock(makeVscodeMock({ yamlExt: "not-an-object" }));
  });
  afterEach(() => {
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("warns_yaml_exports_missing_no_throw", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const logs: string[] = [];
    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    const contributor = mod.register({
      cache,
      bundled: {},
      extensionChannel: makeChannel(logs) as never,
    });

    await new Promise((r) => setTimeout(r, 20));

    assert.ok(
      logs.some((l) => l.includes("yaml_exports_missing")),
      `expected yaml_exports_missing in logs, got: ${JSON.stringify(logs)}`,
    );
    assert.doesNotThrow(() => contributor.dispose());
  });
});

describe("yamlSchemaContributor — exports plain object without registerContributor (rung-3)", () => {
  // Rung-2 passes (exports is a plain object), but rung-3 fails because
  // registerContributor is not a function. Expect yaml_registerContributor_missing.
  beforeEach(() => {
    // yamlExt is a plain object (passes rung-2) but has no registerContributor (fails rung-3)
    installVscodeMock(makeVscodeMock({ yamlExt: {} }));
  });
  afterEach(() => {
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("warns_yaml_registerContributor_missing_when_registerContributor_absent_no_throw", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const logs: string[] = [];
    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    const contributor = mod.register({
      cache,
      bundled: {},
      extensionChannel: makeChannel(logs) as never,
    });

    await new Promise((r) => setTimeout(r, 20));

    // Rung-2 passes (plain object), rung-3 fires yaml_registerContributor_missing
    assert.ok(
      logs.some((l) => l.includes("yaml_registerContributor_missing")),
      `expected yaml_registerContributor_missing in logs, got: ${JSON.stringify(logs)}`,
    );
    assert.doesNotThrow(() => contributor.dispose());
  });
});

describe("yamlSchemaContributor — well-formed extension", () => {
  let capturedSchemaId = "";
  let capturedRequestSchema: ((r: string) => string | undefined) | undefined;
  let capturedRequestSchemaContent: ((u: string) => string | undefined) | undefined;
  let capturedNotifyUri: string | undefined;

  function makeWellFormedYamlExt() {
    return {
      registerContributor: (
        schemaId: string,
        requestSchema: (r: string) => string | undefined,
        requestSchemaContent: (u: string) => string | undefined,
      ) => {
        capturedSchemaId = schemaId;
        capturedRequestSchema = requestSchema;
        capturedRequestSchemaContent = requestSchemaContent;
      },
      notifySchemaChanged: (uri: string) => {
        capturedNotifyUri = uri;
      },
    };
  }

  beforeEach(() => {
    capturedSchemaId = "";
    capturedRequestSchema = undefined;
    capturedRequestSchemaContent = undefined;
    capturedNotifyUri = undefined;
    installVscodeMock(makeVscodeMock({ yamlExt: makeWellFormedYamlExt() }));
  });
  afterEach(() => {
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("registerContributor_called_once_with_aurelion_pipeline_id_and_callbacks", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    mod.register({ cache, bundled: {}, extensionChannel: makeChannel() as never });
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(capturedSchemaId, "aurelion-pipeline");
    assert.equal(typeof capturedRequestSchema, "function");
    assert.equal(typeof capturedRequestSchemaContent, "function");
  });

  it("requestSchema_pipelines_yaml_returns_VIRTUAL_URI", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    mod.register({ cache, bundled: {}, extensionChannel: makeChannel() as never });
    await new Promise((r) => setTimeout(r, 20));

    const result = capturedRequestSchema!("file:///workspace/pipelines/foo.yaml");
    assert.equal(result, VIRTUAL_URI);
  });

  it("requestSchema_pipelines_yml_returns_VIRTUAL_URI", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    mod.register({ cache, bundled: {}, extensionChannel: makeChannel() as never });
    await new Promise((r) => setTimeout(r, 20));

    const result = capturedRequestSchema!("file:///workspace/pipelines/my-pipe.yml");
    assert.equal(result, VIRTUAL_URI);
  });

  it("requestSchema_other_directory_returns_undefined", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    mod.register({ cache, bundled: {}, extensionChannel: makeChannel() as never });
    await new Promise((r) => setTimeout(r, 20));

    const result = capturedRequestSchema!("file:///workspace/other/foo.yaml");
    assert.equal(result, undefined);
  });

  it("requestSchemaContent_VIRTUAL_URI_returns_active_schema_json", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const live = { type: "live", version: 3 };
    let liveStored: unknown = undefined;
    const cache: LiveSchemaCacheIface = {
      setLive: (s) => { liveStored = s; },
      clearLive: () => { liveStored = undefined; },
      hasLive: () => liveStored !== undefined,
      getActiveSchema: (bundled) => liveStored ?? bundled,
    };

    const bundled = { type: "bundled" };
    mod.register({ cache, bundled, extensionChannel: makeChannel() as never });
    await new Promise((r) => setTimeout(r, 20));

    // Before setLive — should return bundled
    const beforeLive = capturedRequestSchemaContent!(VIRTUAL_URI);
    assert.equal(beforeLive, JSON.stringify(bundled));

    // After setLive — should return live
    cache.setLive(live);
    const afterLive = capturedRequestSchemaContent!(VIRTUAL_URI);
    assert.equal(afterLive, JSON.stringify(live));
  });

  it("requestSchemaContent_other_uri_returns_undefined", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    mod.register({ cache, bundled: {}, extensionChannel: makeChannel() as never });
    await new Promise((r) => setTimeout(r, 20));

    const result = capturedRequestSchemaContent!("https://example.com/x.json");
    assert.equal(result, undefined);
  });

  it("notifyChanged_with_notifySchemaChanged_present_forwards_VIRTUAL_URI", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    const contributor = mod.register({ cache, bundled: {}, extensionChannel: makeChannel() as never });
    await new Promise((r) => setTimeout(r, 20));

    capturedNotifyUri = undefined;
    contributor.notifyChanged();
    assert.equal(capturedNotifyUri, VIRTUAL_URI);
  });
});

describe("yamlSchemaContributor — notifySchemaChanged absent", () => {
  let capturedSchemaId = "";

  beforeEach(() => {
    capturedSchemaId = "";
    // yaml ext without notifySchemaChanged
    installVscodeMock(
      makeVscodeMock({
        yamlExt: {
          registerContributor: (id: string) => { capturedSchemaId = id; },
          // notifySchemaChanged intentionally absent
        },
      }),
    );
  });
  afterEach(() => {
    uninstallVscodeMock();
    clearModuleCache();
  });

  it("notifyChanged_without_notifySchemaChanged_no_throw_no_log", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const logs: string[] = [];
    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    const contributor = mod.register({
      cache,
      bundled: {},
      extensionChannel: makeChannel(logs) as never,
    });
    await new Promise((r) => setTimeout(r, 20));

    // Must not throw
    assert.doesNotThrow(() => contributor.notifyChanged());
    // Must not emit any warn/error
    const warnOrError = logs.filter((l) => l.startsWith("WARN:") || l.startsWith("ERROR:"));
    assert.equal(warnOrError.length, 0, `unexpected logs: ${JSON.stringify(warnOrError)}`);
    assert.equal(capturedSchemaId, "aurelion-pipeline");
  });
});

describe("yamlSchemaContributor — notifyChanged buffered before activation", () => {
  // Tests that a notifyChanged() call arriving BEFORE the async activation IIFE
  // resolves is replayed exactly once after activation completes.
  it("notifyChanged_before_activation_replayed_once_after_activation", async () => {
    // Manually deferred activate(): we control when the yaml ext "activates"
    let resolveActivate!: (exports: unknown) => void;
    const activatePromise = new Promise<unknown>((resolve) => {
      resolveActivate = resolve;
    });

    let capturedNotifyUri: string | undefined;

    const yamlExt = {
      activate: () => activatePromise,
    };

    const wellFormedExports = {
      registerContributor: (
        _schemaId: string,
        _requestSchema: (r: string) => string | undefined,
        _requestSchemaContent: (u: string) => string | undefined,
      ) => {},
      notifySchemaChanged: (uri: string) => {
        capturedNotifyUri = uri;
      },
    };

    const vscodeMockDeferred = {
      extensions: {
        getExtension: (id: string) => {
          if (id === "redhat.vscode-yaml") {
            return yamlExt;
          }
          return undefined;
        },
      },
      window: {
        createOutputChannel: () => ({
          info: () => {},
          warn: () => {},
          error: () => {},
          dispose: () => {},
        }),
      },
    };

    installVscodeMock(vscodeMockDeferred);
    clearModuleCache();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONTRIBUTOR_PATH) as ContributorModule;

    const cache: LiveSchemaCacheIface = {
      setLive: () => {},
      clearLive: () => {},
      hasLive: () => false,
      getActiveSchema: (b) => b,
    };

    const contributor = mod.register({
      cache,
      bundled: {},
      extensionChannel: makeChannel() as never,
    });

    // Call notifyChanged BEFORE activation completes — must be buffered
    contributor.notifyChanged();
    assert.equal(
      capturedNotifyUri,
      undefined,
      "notifySchemaChanged must not be called before activation",
    );

    // Now resolve activation with well-formed exports
    resolveActivate(wellFormedExports);

    // Wait for the IIFE to settle
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(
      capturedNotifyUri,
      VIRTUAL_URI,
      `expected capturedNotifyUri === VIRTUAL_URI after activation, got: ${String(capturedNotifyUri)}`,
    );

    uninstallVscodeMock();
    clearModuleCache();
  });
});

describe("yamlSchemaContributor — manifest convention check", () => {
  it("package_json_fileMatch_globs_intersect_with_FILE_GLOB", async () => {
    const pkgPath = path.resolve(__dirname, "..", "..", "..", "..", "..", "package.json");

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require(pkgPath) as {
      contributes?: {
        yamlValidation?: Array<{ fileMatch: string[] }>;
      };
    };

    const fileMatches: string[] =
      pkg.contributes?.yamlValidation?.flatMap((v) => v.fileMatch) ?? [];

    assert.ok(fileMatches.length > 0, "package.json should have yamlValidation fileMatch entries");

    // FILE_GLOB from the task: /[\\/]pipelines[\\/][^\\/]+\.(ya?ml)$/i
    const FILE_GLOB = /[\\/]pipelines[\\/][^\\/]+\.(ya?ml)$/i;

    // Build sample paths from glob patterns like **/pipelines/*.yaml
    const matchingGlobs = fileMatches.filter((pattern) => {
      // Convert glob to a sample path for testing
      const sample = pattern
        .replace("**/pipelines/", "/workspace/pipelines/")
        .replace("*.yaml", "test.yaml")
        .replace("*.yml", "test.yml");
      return FILE_GLOB.test(sample);
    });

    assert.ok(
      matchingGlobs.length > 0,
      `No fileMatch glob in package.json matched FILE_GLOB. fileMatch: ${JSON.stringify(fileMatches)}`,
    );

    // Ensure no orphan globs (all should match)
    assert.equal(
      matchingGlobs.length,
      fileMatches.length,
      `Some fileMatch globs do not match FILE_GLOB (orphan globs found). fileMatch: ${JSON.stringify(fileMatches)}, matching: ${JSON.stringify(matchingGlobs)}`,
    );
  });
});
