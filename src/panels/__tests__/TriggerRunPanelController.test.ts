/**
 * TriggerRunPanelController tests.
 * Uses Module._load to inject vscode + api stubs before requiring the module.
 *
 * Guardian Optional #1: verifies args payload never appears in logged output.
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

let createPanelCount = 0;
let revealCount = 0;
let disposeCount = 0;
let postedMessages: unknown[] = [];
let executedCommands: string[] = [];

type FakePanel = {
  webview: {
    html: string;
    cspSource: string;
    asWebviewUri: (u: unknown) => { toString: () => string };
    onDidReceiveMessage: (cb: (msg: unknown) => void) => { dispose: () => void };
    postMessage: (msg: unknown) => Promise<boolean>;
  };
  reveal: () => void;
  dispose: () => void;
  onDidDispose: (cb: () => void) => { dispose: () => void };
  _fireDispose: () => void;
  _fireMessage: (msg: unknown) => void;
};

function makeFakePanel(): FakePanel {
  let disposeCallback: (() => void) | undefined;
  let messageCallback: ((msg: unknown) => void) | undefined;

  return {
    webview: {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (_u: unknown) => ({
        toString: () => "vscode-resource://media/trigger-run-webview.js",
      }),
      onDidReceiveMessage: (cb: (msg: unknown) => void) => {
        messageCallback = cb;
        return { dispose: () => {} };
      },
      postMessage: async (msg: unknown) => {
        postedMessages.push(msg);
        return true;
      },
    },
    reveal: () => {
      revealCount++;
    },
    dispose: () => {
      disposeCount++;
      disposeCallback?.();
    },
    onDidDispose: (cb: () => void) => {
      disposeCallback = cb;
      return { dispose: () => {} };
    },
    _fireDispose: () => {
      disposeCallback?.();
    },
    _fireMessage: (msg: unknown) => {
      messageCallback?.(msg);
    },
  };
}

let currentFakePanel: FakePanel | undefined;

// ─── Channel tracking ─────────────────────────────────────────────────────────

let loggedInfoArgs: unknown[][] = [];
let loggedErrorArgs: unknown[][] = [];

function makeChannel() {
  return {
    info: (...args: unknown[]) => { loggedInfoArgs.push(args); },
    error: (...args: unknown[]) => { loggedErrorArgs.push(args); },
    warn: (..._args: unknown[]) => {},
  };
}

// ─── API stubs ────────────────────────────────────────────────────────────────

type FetchPipelinesFn = () => Promise<{ name: string }[]>;
type TriggerPipelineRunFn = (req: {
  pipeline_name: string;
  args?: Record<string, unknown> | undefined;
}) => Promise<{ pipeline_run_id: string; status: string; pipeline_version: number; created: boolean }>;

let fetchPipelinesStub: FetchPipelinesFn = async () => [
  { name: "pipe-a" },
  { name: "pipe-b" },
];

let triggerPipelineRunStub: TriggerPipelineRunFn = async () => ({
  pipeline_run_id: "run-001",
  status: "pending",
  pipeline_version: 1,
  created: true,
});

class TriggerPipelineRunErrorStub extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`Trigger pipeline run failed (${status}): ${detail}`);
    this.name = "TriggerPipelineRunError";
    this.status = status;
    this.detail = detail;
  }
}

const platformClientStub = {
  fetchPipelines: (...args: Parameters<FetchPipelinesFn>) => fetchPipelinesStub(...args),
  triggerPipelineRun: (...args: Parameters<TriggerPipelineRunFn>) => triggerPipelineRunStub(...args),
  TriggerPipelineRunError: TriggerPipelineRunErrorStub,
  getApiBaseUrl: () => "http://localhost:8000",
};

const triggerRunPanelHtmlStub = {
  renderTriggerRunPanelHtml: (_nonce: string, _cspSource: string, _scriptUri: string) =>
    "<html><body>stub-trigger</body></html>",
};

const vscodeMock = {
  window: {
    createWebviewPanel: (
      _viewType: string,
      _title: string,
      _column: number,
      _options: unknown,
    ): FakePanel => {
      createPanelCount++;
      currentFakePanel = makeFakePanel();
      return currentFakePanel;
    },
  },
  ViewColumn: { Beside: 2 },
  Uri: {
    joinPath: (..._parts: unknown[]) => ({
      toString: () => "vscode-resource://ext/media/trigger-run-webview.js",
    }),
  },
  commands: {
    executeCommand: (cmd: string) => {
      executedCommands.push(cmd);
      return Promise.resolve();
    },
  },
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue,
    }),
  },
};

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
      (request.includes("triggerRunPanelHtml") || request.endsWith("triggerRunPanelHtml.js"))
    ) {
      return triggerRunPanelHtmlStub;
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

// ─── Module path helpers ───────────────────────────────────────────────────────

const CONTROLLER_PATH = path.resolve(__dirname, "..", "TriggerRunPanelController.js");
const HTML_PATH = path.resolve(__dirname, "..", "triggerRunPanelHtml.js");
const CLIENT_PATH = path.resolve(__dirname, "..", "..", "api", "platformClient.js");
const SSE_PARSER_PATH = path.resolve(__dirname, "..", "..", "api", "sseParser.js");
const TRIGGER_FORM_MODEL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "integrations",
  "pipelines",
  "triggerForm",
  "triggerFormModel.js",
);

type RequireWithCache = typeof require & { cache: Record<string, unknown> };

function clearModuleCache(): void {
  const cache = (require as unknown as RequireWithCache).cache;
  delete cache[CONTROLLER_PATH];
  delete cache[HTML_PATH];
  delete cache[CLIENT_PATH];
  delete cache[SSE_PARSER_PATH];
  delete cache[TRIGGER_FORM_MODEL_PATH];
}

type FakeLogChannel = ReturnType<typeof makeChannel>;

type ControllerModule = {
  TriggerRunPanelController: new (opts: {
    extensionChannel: FakeLogChannel;
    extensionUri: unknown;
  }) => {
    openOrReveal: () => void;
    dispose: () => void;
    notifyApiBaseChanged: () => void;
    _handleMessage: (msg: unknown) => Promise<void>;
  };
};

function makeExtensionUri(): unknown {
  return { toString: () => "vscode-resource://ext" };
}

// ─── Helper: wait for all pending microtasks ──────────────────────────────────

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("TriggerRunPanelController", () => {
  beforeEach(() => {
    createPanelCount = 0;
    revealCount = 0;
    disposeCount = 0;
    postedMessages = [];
    executedCommands = [];
    loggedInfoArgs = [];
    loggedErrorArgs = [];
    currentFakePanel = undefined;
    fetchPipelinesStub = async () => [{ name: "pipe-a" }, { name: "pipe-b" }];
    triggerPipelineRunStub = async () => ({
      pipeline_run_id: "run-001",
      status: "pending",
      pipeline_version: 1,
      created: true,
    });
    installMocks();
  });

  afterEach(() => {
    uninstallMocks();
    clearModuleCache();
  });

  it("openOrReveal() creates a panel exactly once", () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new TriggerRunPanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();
    assert.equal(createPanelCount, 1);
    ctrl.dispose();
  });

  it("openOrReveal() second call reveals instead of creating a second panel", () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new TriggerRunPanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();
    ctrl.openOrReveal();
    assert.equal(createPanelCount, 1);
    assert.equal(revealCount, 1);
    ctrl.dispose();
  });

  it("loadPipelines message → posts {type:'pipelines', names} with pipeline names", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new TriggerRunPanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();

    await ctrl._handleMessage({ type: "loadPipelines" });
    await flushMicrotasks();

    const pipelinesMsg = postedMessages.find(
      (m) => typeof m === "object" && m !== null && (m as Record<string, unknown>)["type"] === "pipelines",
    );
    assert.ok(pipelinesMsg !== undefined, "should post a 'pipelines' message");
    const msg = pipelinesMsg as Record<string, unknown>;
    assert.deepEqual(msg["names"], ["pipe-a", "pipe-b"]);
    ctrl.dispose();
  });

  it("submit happy path → calls triggerPipelineRun, executes refreshPipelines, disposes panel", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const channel = makeChannel();
    const ctrl = new TriggerRunPanelController({
      extensionChannel: channel,
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();

    const args = { env: "prod" };
    await ctrl._handleMessage({ type: "submit", pipelineName: "pipe-a", args });
    await flushMicrotasks();

    const okMsg = postedMessages.find(
      (m) => typeof m === "object" && m !== null && (m as Record<string, unknown>)["type"] === "submitOk",
    );
    assert.ok(okMsg !== undefined, "should post submitOk");
    assert.ok(
      executedCommands.includes("aurelion.refreshPipelines"),
      "should execute refreshPipelines",
    );
    // Panel should have been disposed (disposeCount >= 1 after ctrl.dispose in cleanup)
    assert.ok(disposeCount >= 1, "panel dispose should have been called");
  });

  it("submit happy path → args payload is NOT present in any logged output (PII guard)", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const channel = makeChannel();
    const ctrl = new TriggerRunPanelController({
      extensionChannel: channel,
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();

    const sensitiveArgs = { secret_token: "SUPER_SECRET_VALUE_XYZ" };
    await ctrl._handleMessage({ type: "submit", pipelineName: "pipe-a", args: sensitiveArgs });
    await flushMicrotasks();

    // Check all logged info/error calls for the sensitive value
    const allLoggedText = [
      ...loggedInfoArgs.flat(),
      ...loggedErrorArgs.flat(),
    ].map(String).join(" ");

    assert.ok(
      !allLoggedText.includes("SUPER_SECRET_VALUE_XYZ"),
      `args payload must not appear in logs, but found in: "${allLoggedText}"`,
    );
    ctrl.dispose();
  });

  it("submit with server 422 → posts submitError with detail, does NOT dispose, does NOT call refresh", async () => {
    clearModuleCache();
    triggerPipelineRunStub = async () => {
      throw new TriggerPipelineRunErrorStub(422, "pipeline 'pipe-a' validation error");
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new TriggerRunPanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();
    const initialDisposeCount = disposeCount;

    await ctrl._handleMessage({ type: "submit", pipelineName: "pipe-a", args: {} });
    await flushMicrotasks();

    const errMsg = postedMessages.find(
      (m) => typeof m === "object" && m !== null && (m as Record<string, unknown>)["type"] === "submitError",
    );
    assert.ok(errMsg !== undefined, "should post submitError");
    assert.equal(
      (errMsg as Record<string, unknown>)["detail"],
      "pipeline 'pipe-a' validation error",
    );
    assert.ok(
      !executedCommands.includes("aurelion.refreshPipelines"),
      "should NOT execute refreshPipelines on 422",
    );
    assert.equal(disposeCount, initialDisposeCount, "panel should NOT be disposed on 422");

    ctrl.dispose();
  });

  it("submit with generic 5xx → posts submitError with error message, no refresh", async () => {
    clearModuleCache();
    triggerPipelineRunStub = async () => {
      throw new TriggerPipelineRunErrorStub(500, "internal server error");
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new TriggerRunPanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();

    await ctrl._handleMessage({ type: "submit", pipelineName: "pipe-a", args: {} });
    await flushMicrotasks();

    const errMsg = postedMessages.find(
      (m) => typeof m === "object" && m !== null && (m as Record<string, unknown>)["type"] === "submitError",
    );
    assert.ok(errMsg !== undefined, "should post submitError on 5xx");
    assert.ok(
      !executedCommands.includes("aurelion.refreshPipelines"),
      "should NOT execute refreshPipelines on 5xx",
    );
    ctrl.dispose();
  });

  it("submit with tampered args (array instead of object) → posts submitError, does NOT call triggerPipelineRun", async () => {
    clearModuleCache();
    let triggerCallCount = 0;
    triggerPipelineRunStub = async () => {
      triggerCallCount++;
      return { pipeline_run_id: "run-001", status: "pending", pipeline_version: 1, created: true };
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new TriggerRunPanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();

    // Simulate tampered postMessage: args is an array, not an object
    await ctrl._handleMessage({ type: "submit", pipelineName: "pipe-a", args: [1, 2, 3] as unknown as Record<string, unknown> });
    await flushMicrotasks();

    const errMsg = postedMessages.find(
      (m) => typeof m === "object" && m !== null && (m as Record<string, unknown>)["type"] === "submitError",
    );
    assert.ok(errMsg !== undefined, "should post submitError for tampered array args");
    assert.equal(triggerCallCount, 0, "triggerPipelineRun must NOT be called for invalid args");
    assert.ok(
      !executedCommands.includes("aurelion.refreshPipelines"),
      "should NOT execute refreshPipelines for invalid args",
    );
    ctrl.dispose();
  });

  it("notifyApiBaseChanged() posts reload message to webview", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new TriggerRunPanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();
    postedMessages = [];

    ctrl.notifyApiBaseChanged();
    await flushMicrotasks();

    const reloadMsg = postedMessages.find(
      (m) => typeof m === "object" && m !== null && (m as Record<string, unknown>)["type"] === "reload",
    );
    assert.ok(reloadMsg !== undefined, "should post reload message");
    ctrl.dispose();
  });

  it("dispose() clears panel so subsequent openOrReveal() creates a new one", () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TriggerRunPanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new TriggerRunPanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();
    assert.equal(createPanelCount, 1);
    ctrl.dispose();
    ctrl.openOrReveal();
    assert.equal(createPanelCount, 2);
    ctrl.dispose();
  });
});
