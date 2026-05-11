/**
 * PipelinesTreeDataProvider tests.
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
  description?: string;
  tooltip?: string;
  constructor(label: string, state: number) {
    this.label = label;
    this.collapsibleState = state;
  }
}

class FakeThemeIcon {
  constructor(public readonly id: string) {}
}

class FakeEventEmitter {
  private listeners: Array<() => void> = [];
  readonly event = (listener: () => void): void => {
    this.listeners.push(listener);
  };
  fire(): void {
    for (const l of this.listeners) l();
  }
  dispose(): void {
    this.listeners = [];
  }
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
  "../../../../out/integrations/pipelines/tree.js",
);

interface PipelineNodeLike {
  kind: string;
  statusKey?: string;
  command?: {
    command: string;
    title: string;
    arguments: Array<Record<string, unknown>>;
  };
  contextValue?: string;
}

interface TreeModule {
  PipelinesTreeDataProvider: new () => {
    getChildren(el?: unknown): PipelineNodeLike[];
    onDidChangeTreeData: (listener: () => void) => void;
    refresh(): void;
    dispose(): void;
  };
}

function loadTreeModule(): TreeModule {
  const orig = Module._load;
  Module._load = (req: string, parent: unknown, isMain: boolean) => {
    if (req === "vscode") return vscodeStub;
    return orig(req, parent, isMain);
  };
  try {
    delete require.cache[require.resolve(TREE_PATH)];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(TREE_PATH) as TreeModule;
  } finally {
    Module._load = orig;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PipelinesTreeDataProvider", () => {
  beforeEach(() => {
    delete require.cache[require.resolve(TREE_PATH)];
  });
  afterEach(() => {
    delete require.cache[require.resolve(TREE_PATH)];
  });

  it("top_level_returns_nine_nodes_with_separator_after_definitions", () => {
    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    const children = provider.getChildren(undefined);
    assert.equal(children.length, 9);
    const expectedIds = [
      "definitions",
      "separator",
      "running",
      "pending",
      "awaiting_event",
      "failed",
      "failed_timeout",
      "cancelled",
      "completed",
    ];
    const actualIds = children.map((c) => {
      if (c.kind === "pipelineStatus") return c.statusKey;
      if (c.kind === "pipelineDefinitions") return "definitions";
      return "separator";
    });
    assert.deepEqual(actualIds, expectedIds);
  });

  it("getChildren_of_leaf_returns_empty", () => {
    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    const children = provider.getChildren(undefined);
    const defsLeaf = children.find((c) => c.kind === "pipelineDefinitions");
    assert.ok(defsLeaf);
    const nested = provider.getChildren(defsLeaf);
    assert.deepEqual(nested, []);
  });

  it("separator_node_has_no_command_no_context", () => {
    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    const children = provider.getChildren(undefined);
    const sep = children.find((c) => c.kind === "pipelineSeparator");
    assert.ok(sep, "Separator node not found");
    assert.equal(sep.command, undefined, "Separator must not be clickable");
    assert.equal(sep.contextValue, "aurelion.pipelineSeparator");
  });

  it("definitions_node_has_distinct_context_value", () => {
    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    const children = provider.getChildren(undefined);

    const defsNode = children.find((c) => c.kind === "pipelineDefinitions");
    const statusNode = children.find((c) => c.kind === "pipelineStatus");

    assert.ok(defsNode, "Definitions node not found");
    assert.ok(statusNode, "Status node not found");
    assert.equal(defsNode.contextValue, "aurelion.pipelineDefinitions");
    assert.equal(statusNode.contextValue, "aurelion.pipelineStatus");
  });

  it("refresh_fires_change_event_once", () => {
    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    let fired = 0;
    provider.onDidChangeTreeData(() => {
      fired++;
    });
    provider.refresh();
    assert.equal(fired, 1);
  });

  it("dispose_disposes_emitter", () => {
    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    assert.doesNotThrow(() => {
      provider.dispose();
    });
  });

  it("every_pipelineStatusNode_has_open_detail_panel_command", () => {
    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    const children = provider.getChildren(undefined);
    const statusNodes = children.filter((c) => c.kind === "pipelineStatus");
    assert.ok(statusNodes.length > 0, "Expected at least one pipelineStatus node");
    for (const node of statusNodes) {
      assert.ok(node.command, `Node ${node.statusKey} has no command`);
      assert.equal(node.command.command, "aurelion.openDetailPanel");
      const arg = node.command.arguments[0];
      assert.equal(arg["kind"], "pipelineRuns");
      assert.equal(arg["ctxKey"], `pipeline-runs:${node.statusKey}`);
      assert.equal(arg["statusKey"], node.statusKey);
      assert.equal(typeof arg["label"], "string");
    }
  });

  it("definitions_node_has_open_definitions_command", () => {
    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    const children = provider.getChildren(undefined);
    const defs = children.find((c) => c.kind === "pipelineDefinitions");
    assert.ok(defs, "Definitions node not found");
    assert.ok(defs.command, "Definitions node must have a command");
    assert.equal(defs.command.command, "aurelion.openDetailPanel");
    const arg = defs.command.arguments[0];
    assert.equal(arg["kind"], "pipelineDefinitions");
    assert.equal(arg["ctxKey"], "pipeline-definitions");
  });

  it("command_arguments_pass_isOpenDetailPanelArg_guard", () => {
    // Guards module is pure (no vscode dep) — import compiled JS directly.
    const guardsPath = path.resolve(
      __dirname,
      "../../../../out/integrations/commands/guards.js",
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isOpenDetailPanelArg } = require(guardsPath) as {
      isOpenDetailPanelArg: (v: unknown) => boolean;
    };

    const { PipelinesTreeDataProvider } = loadTreeModule();
    const provider = new PipelinesTreeDataProvider();
    const children = provider.getChildren(undefined);
    const statusNodes = children.filter((c) => c.kind === "pipelineStatus");

    for (const node of statusNodes) {
      assert.ok(node.command, `No command on ${node.statusKey}`);
      const arg = node.command.arguments[0];
      assert.equal(
        isOpenDetailPanelArg(arg),
        true,
        `isOpenDetailPanelArg returned false for statusKey=${node.statusKey}`,
      );
    }

    // definitions node must also pass the guard
    const defsNode = children.find((c) => c.kind === "pipelineDefinitions");
    assert.ok(defsNode?.command, "Definitions node must have a command");
    const defsArg = defsNode.command.arguments[0];
    assert.equal(
      isOpenDetailPanelArg(defsArg),
      true,
      "isOpenDetailPanelArg returned false for pipelineDefinitions command arg",
    );
  });
});
