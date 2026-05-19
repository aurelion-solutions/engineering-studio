/**
 * DetailPanelController tests — pipeline definition kinds.
 * Uses Module._load to inject vscode + api stubs before requiring the module.
 *
 * Covers:
 *   - pipelineDefinitions: fetchPipelines called once on open
 *   - pipelineDefinitions: row click sends openDetailPanel with kind=pipelineDefinitionDetail
 *   - pipelineDefinitionDetail: fetchPipelineDetail called once on open
 *   - pipelineDefinitionDetail: refreshSeconds === null (no polling)
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
let originalLoad: LoadFn | undefined;

// ─── Panel tracking ───────────────────────────────────────────────────────────

let postedMessages: unknown[] = [];
let messageCallback: ((msg: unknown) => void) | undefined;
let disposeCallback: (() => void) | undefined;

type FakePanel = {
  webview: {
    html: string;
    cspSource: string;
    asWebviewUri: (u: unknown) => { toString: () => string };
    onDidReceiveMessage: (cb: (msg: unknown) => void) => { dispose: () => void };
    postMessage: (msg: unknown) => Promise<boolean>;
  };
  viewColumn: number | undefined;
  reveal: (col?: number) => void;
  dispose: () => void;
  onDidDispose: (cb: () => void) => { dispose: () => void };
};

function makeFakePanel(): FakePanel {
  return {
    webview: {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (_u: unknown) => ({ toString: () => "vscode-resource://media/panel-webview.js" }),
      onDidReceiveMessage: (cb: (msg: unknown) => void) => {
        messageCallback = cb;
        return { dispose: () => {} };
      },
      postMessage: async (msg: unknown) => {
        postedMessages.push(msg);
        return true;
      },
    },
    viewColumn: 2,
    reveal: (_col?: number) => {},
    dispose: () => { disposeCallback?.(); },
    onDidDispose: (cb: () => void) => {
      disposeCallback = cb;
      return { dispose: () => {} };
    },
  };
}

// ─── API stubs ────────────────────────────────────────────────────────────────

type FetchPipelinesFn = () => Promise<unknown[]>;
type FetchPipelineDetailFn = (name: string) => Promise<unknown>;

let fetchPipelinesCallCount = 0;
let fetchPipelinesStub: FetchPipelinesFn = async () => {
  fetchPipelinesCallCount++;
  return [
    { name: "pipe-alpha", version: 1, schema_version: 1, description: null, step_count: 0, triggers: [] },
    { name: "pipe-beta",  version: 2, schema_version: 1, description: "beta desc", step_count: 2, triggers: [{ type: "manual" }] },
  ];
};

let fetchPipelineDetailCallCount = 0;
let fetchPipelineDetailStub: FetchPipelineDetailFn = async (_name: string) => {
  fetchPipelineDetailCallCount++;
  return {
    name: _name,
    version: 1,
    schema_version: 1,
    description: null,
    step_count: 1,
    content_hash: "abc123",
    source_path: "pipelines/example.yaml",
    triggers: [{ type: "manual" }],
    steps: [{ name: "step-1", engine: "my-engine", action: "do-something", args: {}, requires: [], on_error: null }],
  };
};

type FetchPipelineRunDetailFn = (runId: string) => Promise<unknown>;
type FetchStepDetailFn = (runId: string, stepId: string) => Promise<unknown>;

let fetchPipelineRunDetailStub: FetchPipelineRunDetailFn = async (_runId: string) => ({
  id: _runId,
  pipeline_name: "test-pipe",
  pipeline_version: 1,
  content_hash: "run-hash",
  status: "running",
  trigger_source: "manual",
  current_step: null,
  started_at: null,
  finished_at: null,
  error: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  args: {},
  steps: [],
});

let fetchStepDetailCallCount = 0;
let fetchStepDetailStub: FetchStepDetailFn = async (_runId: string, _stepId: string) => {
  fetchStepDetailCallCount++;
  return {
    id: _stepId,
    step_name: "test-step",
    attempt: 1,
    status: "completed",
    started_at: null,
    finished_at: null,
    error: null,
    args: { input: 42 },
    result: { output: 99 },
  };
};

const platformClientStub = {
  fetchPipelines: (...args: Parameters<FetchPipelinesFn>) => fetchPipelinesStub(...args),
  fetchPipelineDetail: (...args: Parameters<FetchPipelineDetailFn>) => fetchPipelineDetailStub(...args),
  fetchPipelineRunDetail: (...args: Parameters<FetchPipelineRunDetailFn>) => fetchPipelineRunDetailStub(...args),
  fetchStepDetail: (...args: Parameters<FetchStepDetailFn>) => fetchStepDetailStub(...args),
  // Other functions used by DetailPanelController that we don't exercise here
  fetchApplications: async () => [],
  fetchMatchingConnectorInstances: async () => [],
  fetchPlatformEvents: async () => [],
  fetchPlatformLogs: async () => [],
  fetchPipelineRuns: async () => [],
  fetchPipelineStepDetail: async () => ({}),
  cancelPipelineRun: async () => {},
  retryPipelineRun: async () => {},
  updateApplication: async () => {},
  fetchCustomers: async () => [],
  fetchSubjects: async () => [],
  fetchAccounts: async () => [],
  fetchResources: async () => [],
  fetchAccessArtifacts: async () => [],
  fetchAccessFacts: async () => [],
  fetchArtifactBindings: async () => [],
  fetchInitiatives: async () => [],
  fetchOwnershipAssignments: async () => [],
  fetchAccessUsageFacts: async () => [],
  fetchThreatFacts: async () => [],
  fetchPersons: async () => ({ items: [], total: 0, limit: 1000, offset: 0 }),
  fetchPersonAttributes: async () => [],
  fetchEmployees: async () => ({ items: [], total: 0, limit: 1000, offset: 0 }),
  fetchEmployeeAttributes: async () => [],
  fetchNHIs: async () => [],
  fetchEmployeeRecords: async () => [],
  fetchCapabilities: async () => [],
  fetchCapabilityMappings: async () => [],
  fetchCapabilityGrants: async () => [],
  fetchSodRules: async () => [],
  fetchSodRuleConditions: async () => [],
  fetchFindings: async () => [],
  fetchMitigations: async () => [],
  fetchScanRuns: async () => [],
  fetchFeedbacks: async () => [],
  fetchLlmModels: async () => [],
  fetchLlmExecutionProfiles: async () => [],
  fetchAccessFactsForState: async () => [],
  fetchIncomingDeltaItems: async () => ({ items: [], total: 0 }),
  fetchOutgoingPlanItems: async () => ({ items: [], total: 0 }),
  fetchAccessStateDiffCount: async () => ({ incoming: 3, outgoing: 7, total: 10 }),
};

const panelHtmlStub = {
  renderPanelHtml: (_args: unknown) =>
    "<html><body>stub-panel</body></html>",
};

const vscodeMock = {
  window: {
    createWebviewPanel: (
      _viewType: string,
      _title: string,
      _column: number,
      _options: unknown,
    ): FakePanel => {
      return makeFakePanel();
    },
    showWarningMessage: async () => undefined,
    showInformationMessage: async () => undefined,
    showErrorMessage: async () => undefined,
  },
  ViewColumn: { Beside: 2 },
  Uri: {
    joinPath: (..._parts: unknown[]) => ({
      toString: () => "vscode-resource://ext/media/panel-webview.js",
    }),
  },
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue,
    }),
  },
};

// ─── Module path helpers ───────────────────────────────────────────────────────

const CONTROLLER_PATH = path.resolve(__dirname, "..", "DetailPanelController.js");
const PANEL_HTML_PATH  = path.resolve(__dirname, "..", "panelHtml.js");
const CLIENT_PATH      = path.resolve(__dirname, "..", "..", "api", "platformClient.js");
const SSE_PARSER_PATH  = path.resolve(__dirname, "..", "..", "api", "sseParser.js");

type RequireWithCache = typeof require & { cache: Record<string, unknown> };

function clearModuleCache(): void {
  const cache = (require as unknown as RequireWithCache).cache;
  delete cache[CONTROLLER_PATH];
  delete cache[PANEL_HTML_PATH];
  delete cache[CLIENT_PATH];
  delete cache[SSE_PARSER_PATH];
}

function installMocks(): void {
  originalLoad = NodeModule._load;
  NodeModule._load = function (
    request: string,
    parent: unknown,
    isMain: boolean,
  ): unknown {
    if (request === "vscode") return vscodeMock;
    if (
      typeof request === "string" &&
      (request.includes("platformClient") || request.endsWith("platformClient.js"))
    ) {
      return platformClientStub;
    }
    if (
      typeof request === "string" &&
      (request.includes("panelHtml") || request.endsWith("panelHtml.js"))
    ) {
      return panelHtmlStub;
    }
    return originalLoad!(request, parent, isMain);
  };
}

function uninstallMocks(): void {
  if (originalLoad !== undefined) {
    NodeModule._load = originalLoad;
    originalLoad = undefined;
  }
}

// ─── Controller module type ────────────────────────────────────────────────────

type FakeLogChannel = {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

type ControllerModule = {
  DetailPanelController: new (opts: {
    extensionChannel: FakeLogChannel;
    refreshSecondsProvider: () => number;
    extensionUri: unknown;
  }) => {
    openOrReveal: (args: unknown) => void;
    dispose: () => void;
  };
};

function makeChannel(): FakeLogChannel {
  return {
    info: (..._args: unknown[]) => {},
    error: (..._args: unknown[]) => {},
    warn: (..._args: unknown[]) => {},
  };
}

function makeExtensionUri(): unknown {
  return { toString: () => "vscode-resource://ext" };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("DetailPanelController — pipelineDefinitions kind", () => {
  beforeEach(() => {
    postedMessages = [];
    messageCallback = undefined;
    disposeCallback = undefined;
    fetchPipelinesCallCount = 0;
    fetchPipelineDetailCallCount = 0;
    fetchStepDetailCallCount = 0;
    fetchPipelinesStub = async () => {
      fetchPipelinesCallCount++;
      return [
        { name: "pipe-alpha", version: 1, schema_version: 1, description: null, step_count: 0, triggers: [] },
        { name: "pipe-beta",  version: 2, schema_version: 1, description: "beta", step_count: 2, triggers: [{ type: "manual" }] },
      ];
    };
    fetchPipelineDetailStub = async (_name: string) => {
      fetchPipelineDetailCallCount++;
      return {
        name: _name, version: 1, schema_version: 1, description: null,
        step_count: 1, content_hash: "abc", source_path: "p.yaml",
        triggers: [{ type: "manual" }],
        steps: [{ name: "s1", engine: "eng", action: "act", args: {}, requires: [], on_error: null }],
      };
    };
    installMocks();
  });

  afterEach(() => {
    uninstallMocks();
    clearModuleCache();
  });

  it("fetchPipelines is called exactly once on open", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({ kind: "pipelineDefinitions", ctxKey: "defs" });
    await flushMicrotasks();

    assert.equal(fetchPipelinesCallCount, 1, "fetchPipelines must be called exactly once");
    ctrl.dispose();
  });

  it("row click posts openDetailPanel message with kind=pipelineDefinitionDetail and correct name", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;

    // Track openOrReveal calls for sub-panels
    let secondOpenArgs: unknown = undefined;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    // Monkey-patch openOrReveal to capture second call
    const origOpen = ctrl.openOrReveal.bind(ctrl);
    let callCount = 0;
    ctrl.openOrReveal = (args: unknown) => {
      callCount++;
      if (callCount === 1) {
        origOpen(args);
      } else {
        // Second call: this is the drill-down
        secondOpenArgs = args;
      }
    };

    ctrl.openOrReveal({ kind: "pipelineDefinitions", ctxKey: "defs" });
    await flushMicrotasks();

    // Fire a row-click message from main tbody (no section field)
    assert.ok(messageCallback !== undefined, "onDidReceiveMessage callback must be registered");
    messageCallback({ type: "itemClick", id: "pipe-alpha" });
    await flushMicrotasks();

    assert.ok(secondOpenArgs !== null && secondOpenArgs !== undefined, "drill-down openOrReveal should have been called");
    const args = secondOpenArgs as Record<string, unknown>;
    assert.equal(args["kind"], "pipelineDefinitionDetail", "kind must be pipelineDefinitionDetail");
    assert.equal(args["name"], "pipe-alpha", "name must match the clicked row id");
    ctrl.dispose();
  });
});

describe("DetailPanelController — pipelineDefinitionDetail kind", () => {
  beforeEach(() => {
    postedMessages = [];
    messageCallback = undefined;
    disposeCallback = undefined;
    fetchPipelinesCallCount = 0;
    fetchPipelineDetailCallCount = 0;
    fetchStepDetailCallCount = 0;
    fetchPipelinesStub = async () => {
      fetchPipelinesCallCount++;
      return [];
    };
    fetchPipelineDetailStub = async (_name: string) => {
      fetchPipelineDetailCallCount++;
      return {
        name: _name, version: 3, schema_version: 1, description: "detail desc",
        step_count: 2, content_hash: "xyz", source_path: "pipelines/x.yaml",
        triggers: [{ type: "mq", routing_key: "rk.test", match: {} }],
        steps: [
          { name: "step-1", engine: "eng", action: "act", args: {}, requires: [], on_error: null },
          { name: "step-2", type: "wait_for_event", args: {}, requires: ["step-1"], on_error: null },
        ],
      };
    };
    installMocks();
  });

  afterEach(() => {
    uninstallMocks();
    clearModuleCache();
  });

  it("fetchPipelineDetail is called exactly once on open with correct name", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({ kind: "pipelineDefinitionDetail", ctxKey: "pipeline-def:my-pipe", name: "my-pipe" });
    await flushMicrotasks();

    assert.equal(fetchPipelineDetailCallCount, 1, "fetchPipelineDetail must be called exactly once");
    ctrl.dispose();
  });

  it("no setInterval is scheduled (refreshSeconds === null) for pipelineDefinitionDetail", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;

    let setIntervalCallCount = 0;
    const origSetInterval = globalThis.setInterval;
    globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
      setIntervalCallCount++;
      return origSetInterval(...args);
    }) as typeof setInterval;

    try {
      const ctrl = new DetailPanelController({
        extensionChannel: makeChannel(),
        refreshSecondsProvider: () => 30,
        extensionUri: makeExtensionUri(),
      });

      ctrl.openOrReveal({ kind: "pipelineDefinitionDetail", ctxKey: "pipeline-def:no-poll", name: "no-poll" });
      await flushMicrotasks();

      assert.equal(setIntervalCallCount, 0, "setInterval must NOT be called for pipelineDefinitionDetail");
      ctrl.dispose();
    } finally {
      globalThis.setInterval = origSetInterval;
    }
  });

  it("pipelineDefinitionDetail update payload contains dag with elements and argsByStep", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({ kind: "pipelineDefinitionDetail", ctxKey: "pipeline-def:dag-test", name: "dag-test" });
    await flushMicrotasks();

    const updateMsg = postedMessages.find(
      (m) => (m as Record<string, unknown>)["type"] === "update",
    ) as Record<string, unknown> | undefined;

    assert.ok(updateMsg !== undefined, "update message must have been posted");
    const dag = updateMsg["dag"] as Record<string, unknown> | undefined;
    assert.ok(dag !== undefined, "update message must contain dag field");

    const elements = dag["elements"] as unknown[];
    assert.ok(Array.isArray(elements), "dag.elements must be an array");
    assert.ok(elements.length > 0, "dag.elements must be non-empty for steps fixture");

    const argsByStep = dag["argsByStep"] as Record<string, unknown>;
    assert.ok(typeof argsByStep === "object" && argsByStep !== null, "dag.argsByStep must be an object");
    // Fixture steps: step-1 (engine_call) and step-2 (wait_for_event)
    assert.ok("step-1" in argsByStep, "argsByStep must contain 'step-1' key");
    assert.ok("step-2" in argsByStep, "argsByStep must contain 'step-2' key");

    ctrl.dispose();
  });

  it("dagNodeClick message triggers extensionChannel.info and does NOT call _refresh", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;

    let infoCallCount = 0;
    const channel = {
      info: (..._args: unknown[]) => { infoCallCount++; },
      error: (..._args: unknown[]) => {},
      warn: (..._args: unknown[]) => {},
    };

    const ctrl = new DetailPanelController({
      extensionChannel: channel,
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({ kind: "pipelineDefinitionDetail", ctxKey: "pipeline-def:click-test", name: "click-test" });
    await flushMicrotasks();

    // Reset counters after initial open/refresh
    const initialPostedCount = postedMessages.length;

    // Simulate webview posting dagNodeClick
    assert.ok(messageCallback !== undefined, "onDidReceiveMessage callback must be registered");
    messageCallback({ type: "dagNodeClick", stepName: "step-1" });
    await flushMicrotasks();

    // extensionChannel.info must have been called at least once after the click
    assert.ok(infoCallCount > 0, "extensionChannel.info must be called on dagNodeClick");

    // No additional update/loading messages should appear (no refresh triggered)
    const newMessages = postedMessages.slice(initialPostedCount);
    const hasRefreshMsg = newMessages.some(
      (m) => {
        const type = (m as Record<string, unknown>)["type"];
        return type === "loading" || type === "update";
      },
    );
    assert.ok(!hasRefreshMsg, "dagNodeClick must NOT trigger a refresh (_refresh must not be called)");

    ctrl.dispose();
  });
});

// ─── pipelineRunDetail tests ───────────────────────────────────────────────────

describe("DetailPanelController — pipelineRunDetail with DAG", () => {
  // A minimal pipeline definition fixture for the stub
  const minimalDefinition = {
    name: "test-pipe",
    version: 1,
    schema_version: 1,
    description: null,
    step_count: 1,
    content_hash: "def-hash",
    source_path: "pipelines/test.yaml",
    triggers: [],
    args_schema: {},
    steps: [
      { name: "step-A", engine: "eng", action: "act", args: {}, requires: [] },
    ],
  };

  beforeEach(() => {
    postedMessages = [];
    messageCallback = undefined;
    disposeCallback = undefined;
    fetchPipelinesCallCount = 0;
    fetchPipelineDetailCallCount = 0;
    fetchStepDetailCallCount = 0;

    fetchPipelinesStub = async () => { fetchPipelinesCallCount++; return []; };
    fetchPipelineDetailStub = async (_name: string) => {
      fetchPipelineDetailCallCount++;
      return minimalDefinition;
    };
    fetchPipelineRunDetailStub = async (_runId: string) => ({
      id: _runId,
      pipeline_name: "test-pipe",
      pipeline_version: 1,
      content_hash: "run-hash",
      status: "running",
      trigger_source: "manual",
      current_step: null,
      started_at: null,
      finished_at: null,
      error: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      args: {},
      steps: [
        { id: "step-id-A", step_name: "step-A", attempt: 1, status: "completed", started_at: null, finished_at: null, error: null },
      ],
    });
    fetchStepDetailStub = async (_runId: string, _stepId: string) => {
      fetchStepDetailCallCount++;
      return {
        id: _stepId,
        step_name: "step-A",
        attempt: 1,
        status: "completed",
        started_at: null,
        finished_at: null,
        error: null,
        args: { k: 1 },
        result: { r: 2 },
      };
    };
    installMocks();
  });

  afterEach(() => {
    uninstallMocks();
    clearModuleCache();
  });

  it("pipelineRunDetail_update_payload_contains_dag_after_successful_promise_all", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({
      kind: "pipelineRunDetail",
      ctxKey: "run:abc",
      runId: "abc",
      pipelineName: "test-pipe",
    });
    await flushMicrotasks();

    const updateMsg = postedMessages.find(
      (m) => (m as Record<string, unknown>)["type"] === "update",
    ) as Record<string, unknown> | undefined;

    assert.ok(updateMsg !== undefined, "update message must be posted");
    const dag = updateMsg["dag"] as Record<string, unknown> | undefined;
    assert.ok(dag !== undefined, "dag must be present in update payload");

    const elements = dag["elements"] as unknown[];
    assert.ok(Array.isArray(elements) && elements.length > 0, "dag.elements must be non-empty");

    assert.equal(fetchPipelineDetailCallCount, 1, "fetchPipelineDetail must be called once");

    ctrl.dispose();
  });

  it("pipelineRunDetail_definition_fetch_fails_payload_has_no_dag", async () => {
    // Override fetchPipelineDetail to reject.
    // The closure in platformClientStub reads fetchPipelineDetailStub at call time —
    // so changing the variable here is picked up without re-installing mocks.
    fetchPipelineDetailStub = async (_name: string) => {
      fetchPipelineDetailCallCount++;
      throw new Error("definition not found");
    };

    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({
      kind: "pipelineRunDetail",
      ctxKey: "run:fail",
      runId: "fail",
      pipelineName: "ghost-pipe",
    });
    await flushMicrotasks();

    const updateMsg = postedMessages.find(
      (m) => (m as Record<string, unknown>)["type"] === "update",
    ) as Record<string, unknown> | undefined;

    assert.ok(updateMsg !== undefined, "update must still be posted even when definition fetch fails");
    assert.ok(
      updateMsg["dag"] === undefined || updateMsg["dag"] === null,
      "dag must be absent when definition fetch fails",
    );

    ctrl.dispose();
  });

  it("dagNodeClick_with_stepId_calls_fetchStepDetail_once", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({
      kind: "pipelineRunDetail",
      ctxKey: "run:click-test",
      runId: "run-click",
      pipelineName: "test-pipe",
    });
    await flushMicrotasks();

    assert.ok(messageCallback !== undefined, "messageCallback must be registered");
    const beforeCount = fetchStepDetailCallCount;

    // Simulate webview posting dagNodeClick with a stepId
    messageCallback({ type: "dagNodeClick", stepName: "step-A", stepId: "step-id-A" });
    await flushMicrotasks();

    assert.equal(
      fetchStepDetailCallCount - beforeCount,
      1,
      "fetchStepDetail must be called exactly once on dagNodeClick with stepId",
    );

    // Verify dagNodeDetail was posted back
    const detailMsg = postedMessages.find(
      (m) => (m as Record<string, unknown>)["type"] === "dagNodeDetail",
    ) as Record<string, unknown> | undefined;
    assert.ok(detailMsg !== undefined, "dagNodeDetail must be posted after fetchStepDetail");
    assert.equal(detailMsg["stepName"], "step-A");

    ctrl.dispose();
  });

  it("dagWarning_from_webview_calls_extensionChannel_warn", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;

    let warnCallCount = 0;
    let lastWarnMsg = "";
    const channel = {
      info: (..._args: unknown[]) => {},
      error: (..._args: unknown[]) => {},
      warn: (...args: unknown[]) => {
        warnCallCount++;
        lastWarnMsg = String(args[0]);
      },
    };

    const ctrl = new DetailPanelController({
      extensionChannel: channel,
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({
      kind: "pipelineRunDetail",
      ctxKey: "run:warn-test",
      runId: "run-warn",
      pipelineName: "test-pipe",
    });
    await flushMicrotasks();

    assert.ok(messageCallback !== undefined);
    const beforeWarnCount = warnCallCount;

    // Simulate webview posting dagWarning
    messageCallback({ type: "dagWarning", message: "step 'Z' present in run but not in current definition (content_hash drift)" });
    await flushMicrotasks();

    assert.ok(warnCallCount > beforeWarnCount, "extensionChannel.warn must be called on dagWarning");
    assert.ok(lastWarnMsg.includes("Z"), `warn message must contain 'Z', got: ${lastWarnMsg}`);

    ctrl.dispose();
  });
});

// ─── accessState tab-bar tests ─────────────────────────────────────────────────

describe("DetailPanelController — accessState tab-bar", () => {
  beforeEach(() => {
    postedMessages = [];
    messageCallback = undefined;
    disposeCallback = undefined;
    fetchPipelinesCallCount = 0;
    fetchPipelineDetailCallCount = 0;
    fetchStepDetailCallCount = 0;
    installMocks();
  });

  afterEach(() => {
    uninstallMocks();
    clearModuleCache();
  });

  it("opening accessState panel posts set-tabs with 3 tabs before update", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({ kind: "accessState", ctxKey: "access-state", activeTab: "list" });
    await flushMicrotasks();

    const setTabsMsg = postedMessages.find(
      (m) => (m as Record<string, unknown>)["type"] === "set-tabs",
    ) as Record<string, unknown> | undefined;

    assert.ok(setTabsMsg !== undefined, "set-tabs message must be posted");
    const tabs = setTabsMsg["tabs"] as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(tabs), "tabs must be an array");
    assert.equal(tabs.length, 3, "must have exactly 3 tabs");
    assert.equal(setTabsMsg["activeTab"], "list", "activeTab must be 'list'");

    const counts = setTabsMsg["counts"] as Record<string, number>;
    assert.ok(typeof counts === "object" && counts !== null, "counts must be present");
    assert.equal(counts["incoming"], 3, "incoming count from stub must be 3");
    assert.equal(counts["outgoing"], 7, "outgoing count from stub must be 7");

    // set-tabs must arrive before update
    const setTabsIdx = postedMessages.indexOf(setTabsMsg);
    const updateIdx = postedMessages.findIndex(
      (m) => (m as Record<string, unknown>)["type"] === "update",
    );
    assert.ok(setTabsIdx < updateIdx, "set-tabs must be posted before update");

    ctrl.dispose();
  });

  it("switch-tab message updates activeTab and re-posts set-tabs and update", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({ kind: "accessState", ctxKey: "access-state", activeTab: "list" });
    await flushMicrotasks();

    // Reset captured messages after initial open
    postedMessages = [];

    // Simulate webview tab switch
    assert.ok(messageCallback !== undefined, "messageCallback must be registered");
    messageCallback({ type: "switch-tab", tab: "incoming" });
    await flushMicrotasks();

    const setTabsMsg = postedMessages.find(
      (m) => (m as Record<string, unknown>)["type"] === "set-tabs",
    ) as Record<string, unknown> | undefined;
    assert.ok(setTabsMsg !== undefined, "set-tabs must be re-posted on switch-tab");
    assert.equal(setTabsMsg["activeTab"], "incoming", "activeTab must be updated to 'incoming'");

    const updateMsg = postedMessages.find(
      (m) => (m as Record<string, unknown>)["type"] === "update",
    );
    assert.ok(updateMsg !== undefined, "update message must be posted after switch-tab");

    ctrl.dispose();
  });

  it("switch-tab with invalid tab key is ignored", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DetailPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new DetailPanelController({
      extensionChannel: makeChannel(),
      refreshSecondsProvider: () => 30,
      extensionUri: makeExtensionUri(),
    });

    ctrl.openOrReveal({ kind: "accessState", ctxKey: "access-state", activeTab: "list" });
    await flushMicrotasks();

    postedMessages = [];

    // Send invalid tab
    assert.ok(messageCallback !== undefined);
    messageCallback({ type: "switch-tab", tab: "bogus" });
    await flushMicrotasks();

    const updateAfter = postedMessages.find(
      (m) => (m as Record<string, unknown>)["type"] === "update",
    );
    assert.ok(updateAfter === undefined, "no update must be posted for invalid tab key");

    ctrl.dispose();
  });
});
