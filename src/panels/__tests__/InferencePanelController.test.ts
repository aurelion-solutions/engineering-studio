/**
 * InferencePanelController tests.
 * Uses Module._load to inject vscode + api stubs before requiring the module.
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

// ─── Panel tracking ─────────────────────────────────────────────────────────────

let createPanelCount = 0;
let revealCount = 0;

type FakePanel = {
  webview: {
    html: string;
    cspSource: string;
    asWebviewUri: (u: unknown) => { toString: () => string };
    onDidReceiveMessage: (cb: (msg: unknown) => void) => { dispose: () => void };
    postMessage: (msg: unknown) => Promise<void>;
  };
  reveal: () => void;
  dispose: () => void;
  onDidDispose: (cb: () => void) => { dispose: () => void };
};

function makeFakePanel(): FakePanel & { _fireDispose: () => void } {
  let disposeCallback: (() => void) | undefined;
  return {
    webview: {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (_u: unknown) => ({ toString: () => "vscode-resource://media/inference-webview.js" }),
      onDidReceiveMessage: (_cb: (msg: unknown) => void) => ({ dispose: () => {} }),
      postMessage: async (_msg: unknown) => {},
    },
    reveal: () => { revealCount++; },
    dispose: () => { disposeCallback?.(); },
    onDidDispose: (cb: () => void) => {
      disposeCallback = cb;
      return { dispose: () => {} };
    },
    _fireDispose: () => { disposeCallback?.(); },
  };
}

const vscodeMock = {
  window: {
    createWebviewPanel: (
      _viewType: string,
      _title: string,
      _column: number,
      _options: unknown,
    ): FakePanel => {
      createPanelCount++;
      return makeFakePanel();
    },
  },
  ViewColumn: { Beside: 2 },
  Uri: {
    joinPath: (..._parts: unknown[]) => ({
      toString: () => "vscode-resource://ext/media/inference-webview.js",
    }),
  },
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue,
    }),
  },
};

// Stub for platformClient (used by InferencePanelController)
const platformClientStub = {
  fetchLlmExecutionProfiles: async () => [],
  fetchLlmModels: async () => [],
  runInference: async () => ({ output: "", model: "", tokens_used: 0, latency_ms: 0 }),
  streamInference: async function* () {},
  getApiBaseUrl: () => "http://localhost:8000",
};

// Stub for inferencePanelHtml
const inferencePanelHtmlStub = {
  renderInferencePanelHtml: (_nonce: string, _cspSource: string, _scriptUri: string) =>
    "<html><body>stub</body></html>",
};

function installMocks(): void {
  originalLoad = NodeModule._load;
  NodeModule._load = function (
    request: string,
    parent: unknown,
    isMain: boolean,
  ): unknown {
    if (request === "vscode") return vscodeMock;
    // Handle relative paths for our stubs
    if (
      typeof request === "string" &&
      (request.includes("platformClient") || request.endsWith("platformClient.js"))
    ) {
      return platformClientStub;
    }
    if (
      typeof request === "string" &&
      (request.includes("inferencePanelHtml") || request.endsWith("inferencePanelHtml.js"))
    ) {
      return inferencePanelHtmlStub;
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

const CONTROLLER_PATH = path.resolve(__dirname, "..", "InferencePanelController.js");
const HTML_PATH = path.resolve(__dirname, "..", "inferencePanelHtml.js");
const CLIENT_PATH = path.resolve(__dirname, "..", "..", "api", "platformClient.js");
const SSE_PARSER_PATH = path.resolve(__dirname, "..", "..", "api", "sseParser.js");

type RequireWithCache = typeof require & { cache: Record<string, unknown> };

function clearModuleCache(): void {
  const cache = (require as unknown as RequireWithCache).cache;
  delete cache[CONTROLLER_PATH];
  delete cache[HTML_PATH];
  delete cache[CLIENT_PATH];
  delete cache[SSE_PARSER_PATH];
}

type FakeLogChannel = { error: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; info: (...args: unknown[]) => void };

type ControllerModule = {
  InferencePanelController: new (opts: {
    extensionChannel: FakeLogChannel;
    extensionUri: unknown;
  }) => {
    openOrReveal: () => void;
    dispose: () => void;
    notifyApiBaseChanged: () => void;
    _handleMessage: (msg: unknown) => Promise<void>;
  };
};

function makeChannel(): FakeLogChannel {
  return { error: () => {}, warn: () => {}, info: () => {} };
}

function makeExtensionUri(): unknown {
  return { toString: () => "vscode-resource://ext" };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("InferencePanelController", () => {
  beforeEach(() => {
    createPanelCount = 0;
    revealCount = 0;
    installMocks();
  });
  afterEach(() => {
    uninstallMocks();
    clearModuleCache();
  });

  it("openOrReveal() creates a panel exactly once", () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InferencePanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new InferencePanelController({
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
    const { InferencePanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new InferencePanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();
    ctrl.openOrReveal();
    assert.equal(createPanelCount, 1);
    assert.equal(revealCount, 1);
    ctrl.dispose();
  });

  it("abort message with no inflight is a no-op (does not throw)", async () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InferencePanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new InferencePanelController({
      extensionChannel: makeChannel(),
      extensionUri: makeExtensionUri(),
    });
    ctrl.openOrReveal();
    await ctrl._handleMessage({ type: "abort" });
    // No throw — test passes
    ctrl.dispose();
  });

  it("dispose() clears panel so subsequent openOrReveal() creates a new one", () => {
    clearModuleCache();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InferencePanelController } = require(CONTROLLER_PATH) as ControllerModule;
    const ctrl = new InferencePanelController({
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
