/**
 * LlmTreeDataProvider tests.
 *
 * The tree module imports `vscode` which is unavailable in the test runner.
 * We intercept Module._load to inject a minimal vscode stub before requiring
 * the tree module.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";

// ─── Minimal vscode stub ──────────────────────────────────────────────────────

class FakeTreeItem {
  label: string;
  collapsibleState: number;
  id?: string;
  iconPath?: unknown;
  command?: unknown;
  contextValue?: string;
  constructor(label: string, state: number) {
    this.label = label;
    this.collapsibleState = state;
  }
}

class FakeThemeIcon {
  constructor(public readonly id: string) {}
}

class FakeEventEmitter {
  dispose(): void {}
}

const vscodeStub = {
  TreeItem: FakeTreeItem,
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  ThemeIcon: FakeThemeIcon,
  EventEmitter: FakeEventEmitter,
};

// ─── Module loader ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("node:module") as {
  _load: (req: string, parent: unknown, isMain: boolean) => unknown;
};

const TREE_PATH = path.resolve(
  __dirname,
  "../../../../out/integrations/llm/tree.js",
);

interface TreeModule {
  LlmTreeDataProvider: new () => {
    getChildren(el?: unknown): unknown[];
    dispose(): void;
  };
  LlmModelsEntryNode: new () => { kind: string };
  LlmInferenceEntryNode: new () => { kind: string };
}

function loadTreeModule(): TreeModule {
  const orig = Module._load;
  Module._load = (req: string, parent: unknown, isMain: boolean) => {
    if (req === "vscode") return vscodeStub;
    return orig(req, parent, isMain);
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    delete require.cache[require.resolve(TREE_PATH)];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(TREE_PATH) as TreeModule;
  } finally {
    Module._load = orig;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LlmTreeDataProvider", () => {
  beforeEach(() => {
    delete require.cache[require.resolve(TREE_PATH)];
  });
  afterEach(() => {
    delete require.cache[require.resolve(TREE_PATH)];
  });

  it("root returns exactly two items", () => {
    const { LlmTreeDataProvider } = loadTreeModule();
    const provider = new LlmTreeDataProvider();
    const children = provider.getChildren(undefined);
    assert.equal(children.length, 2);
  });

  it("first item is LlmModelsEntryNode", () => {
    const { LlmTreeDataProvider } = loadTreeModule();
    const provider = new LlmTreeDataProvider();
    const [first] = provider.getChildren(undefined) as Array<{ kind: string }>;
    assert.equal(first.kind, "llmModelsEntry");
  });

  it("second item is LlmInferenceEntryNode", () => {
    const { LlmTreeDataProvider } = loadTreeModule();
    const provider = new LlmTreeDataProvider();
    const [, second] = provider.getChildren(undefined) as Array<{
      kind: string;
    }>;
    assert.equal(second.kind, "llmInferenceEntry");
  });

  it("items have no children (non-expandable)", () => {
    const { LlmTreeDataProvider } = loadTreeModule();
    const provider = new LlmTreeDataProvider();
    const [models, inference] = provider.getChildren(undefined);
    assert.deepEqual(provider.getChildren(models), []);
    assert.deepEqual(provider.getChildren(inference), []);
  });
});
