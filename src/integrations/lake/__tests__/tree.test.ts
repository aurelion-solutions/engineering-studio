/**
 * LakeViewProvider tests.
 *
 * The tree module imports `vscode` which is unavailable in the test runner.
 * We intercept Module._load to inject a minimal vscode stub before requiring
 * the tree module.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import type { LakeBatchListResponseFromApi, LakeStatusFromApi } from "../../../api/types";

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
  "../../../../out/integrations/lake/tree.js",
);

const NODES_PATH = path.resolve(
  __dirname,
  "../../../../out/integrations/lake/lakeNodes.js",
);

interface TreeModule {
  LakeViewProvider: new (
    fetchStatus: () => Promise<LakeStatusFromApi>,
    fetchBatches: () => Promise<LakeBatchListResponseFromApi>,
  ) => {
    getChildren(el?: unknown): unknown[];
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
    delete require.cache[require.resolve(NODES_PATH)];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(TREE_PATH) as TreeModule;
  } finally {
    Module._load = orig;
  }
}

function makeStatus(count: number): LakeStatusFromApi {
  const tables = Array.from({ length: count }, (_, i) => ({
    namespace: "raw",
    name: `table_${i}`,
    current_snapshot_id: i + 1,
    snapshot_count: i + 1,
    last_updated_ms: 1700000000000 + i,
  }));
  return {
    catalog_url: "postgresql://localhost/catalog",
    warehouse_uri: "file:///tmp/warehouse",
    storage_provider: "local",
    tables,
  };
}

function makeBatchResponse(count: number): LakeBatchListResponseFromApi {
  const items = Array.from({ length: count }, (_, i) => ({
    id: `batch-id-${i}`,
    dataset_type: "access_artifacts",
    storage_provider: null,
    storage_key: null,
    row_count: i + 1,
    created_at: "2026-04-27T10:00:00Z",
    application_id: null,
    task_id: null,
    content_type: null,
    metadata_json: null,
    iceberg_namespace: "raw",
    iceberg_table: "access_artifacts",
    snapshot_id: String(i + 1000),
  }));
  return { items, next_cursor: null };
}

function waitMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LakeViewProvider", () => {
  beforeEach(() => {
    delete require.cache[require.resolve(TREE_PATH)];
    delete require.cache[require.resolve(NODES_PATH)];
  });
  afterEach(() => {
    delete require.cache[require.resolve(TREE_PATH)];
    delete require.cache[require.resolve(NODES_PATH)];
  });

  it("initial state (no fetch yet) → empty children", () => {
    const { LakeViewProvider } = loadTreeModule();
    const provider = new LakeViewProvider(
      () => Promise.resolve(makeStatus(2)),
      () => Promise.resolve(makeBatchResponse(1)),
    );
    const children = provider.getChildren(undefined);
    assert.deepEqual(children, []);
  });

  it("both fetchers succeed → tree has table nodes + section header + batch nodes", async () => {
    const { LakeViewProvider } = loadTreeModule();
    const provider = new LakeViewProvider(
      () => Promise.resolve(makeStatus(2)),
      () => Promise.resolve(makeBatchResponse(2)),
    );
    provider.refresh();
    await waitMicrotasks();
    const children = provider.getChildren(undefined) as Array<{
      kind: string;
      label: string;
    }>;
    // 2 table nodes + sectionHeader + 2 batch nodes = 5
    assert.equal(children.length, 5);
    assert.equal(children[0].kind, "lakeTable");
    assert.equal(children[1].kind, "lakeTable");
    assert.equal(children[2].kind, "lakeSectionHeader");
    assert.equal(children[3].kind, "lakeBatch");
    assert.equal(children[4].kind, "lakeBatch");
  });

  it("tables succeed, batches reject → tables render normally; batches section has sectionHeader + error node", async () => {
    const { LakeViewProvider } = loadTreeModule();
    const provider = new LakeViewProvider(
      () => Promise.resolve(makeStatus(1)),
      () => Promise.reject(new Error("batches fetch failed")),
    );
    provider.refresh();
    await waitMicrotasks();
    const children = provider.getChildren(undefined) as Array<{
      kind: string;
      label: string;
    }>;
    // 1 table node + sectionHeader + error node = 3
    assert.equal(children.length, 3);
    assert.equal(children[0].kind, "lakeTable");
    assert.equal(children[1].kind, "lakeSectionHeader");
    assert.equal(children[2].kind, "lakeError");
    assert.ok(
      children[2].label.includes("batches fetch failed"),
      `expected error message: ${children[2].label}`,
    );
  });

  it("tables reject, batches succeed → table error node + section header + batch nodes", async () => {
    const { LakeViewProvider } = loadTreeModule();
    const provider = new LakeViewProvider(
      () => Promise.reject(new Error("tables fetch failed")),
      () => Promise.resolve(makeBatchResponse(1)),
    );
    provider.refresh();
    await waitMicrotasks();
    const children = provider.getChildren(undefined) as Array<{
      kind: string;
      label: string;
    }>;
    // error node + sectionHeader + 1 batch node = 3
    assert.equal(children.length, 3);
    assert.equal(children[0].kind, "lakeError");
    assert.ok(
      children[0].label.includes("tables fetch failed"),
      `expected error message: ${children[0].label}`,
    );
    assert.equal(children[1].kind, "lakeSectionHeader");
    assert.equal(children[2].kind, "lakeBatch");
  });

  it("concurrent refresh guard: second refresh while first is in-flight is a no-op", async () => {
    const { LakeViewProvider } = loadTreeModule();
    let resolveFirst!: (v: LakeStatusFromApi) => void;
    const firstFetch = new Promise<LakeStatusFromApi>((res) => {
      resolveFirst = res;
    });

    let callCount = 0;
    const provider = new LakeViewProvider(
      () => {
        callCount++;
        return firstFetch;
      },
      () => Promise.resolve(makeBatchResponse(0)),
    );

    provider.refresh();
    provider.refresh(); // should be no-op
    assert.equal(callCount, 1);

    resolveFirst(makeStatus(1));
    await waitMicrotasks();
  });

  it("non-root element → empty children", async () => {
    const { LakeViewProvider } = loadTreeModule();
    const provider = new LakeViewProvider(
      () => Promise.resolve(makeStatus(1)),
      () => Promise.resolve(makeBatchResponse(1)),
    );
    provider.refresh();
    await waitMicrotasks();
    const [first] = provider.getChildren(undefined) as unknown[];
    const nested = provider.getChildren(first);
    assert.deepEqual(nested, []);
  });
});
