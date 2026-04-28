/**
 * lakeNodes tests — pure module, no vscode dependency.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLakeBatchNodes, buildLakeErrorNode, buildLakeTableNodes } from "../lakeNodes";
import type { LakeBatchFromApi, LakeStatusFromApi } from "../../../api/types";

function makeStatus(
  tables: LakeStatusFromApi["tables"],
): LakeStatusFromApi {
  return {
    catalog_url: "postgresql://localhost/catalog",
    warehouse_uri: "file:///tmp/warehouse",
    storage_provider: "local",
    tables,
  };
}

function makeTable(
  overrides: Partial<LakeStatusFromApi["tables"][number]> = {},
): LakeStatusFromApi["tables"][number] {
  return {
    namespace: "raw",
    name: "access_artifacts",
    current_snapshot_id: 1234567890,
    snapshot_count: 3,
    last_updated_ms: 1700000000000,
    ...overrides,
  };
}

describe("buildLakeTableNodes", () => {
  it("empty tables list → single placeholder node", () => {
    const result = buildLakeTableNodes(makeStatus([]));
    assert.equal(result.length, 1);
    assert.equal(result[0].kind, "lakePlaceholder");
    assert.equal(result[0].label, "No lake tables");
  });

  it("two tables → 2 nodes with correct labels", () => {
    const status = makeStatus([
      makeTable({ namespace: "raw", name: "access_artifacts", current_snapshot_id: 111 }),
      makeTable({ namespace: "normalized", name: "access_facts", current_snapshot_id: 222 }),
    ]);
    const result = buildLakeTableNodes(status);
    assert.equal(result.length, 2);

    assert.equal(result[0].kind, "lakeTable");
    assert.equal(result[0].label, "raw.access_artifacts");

    assert.equal(result[1].kind, "lakeTable");
    assert.equal(result[1].label, "normalized.access_facts");
  });

  it("description includes snapshot id and count", () => {
    const table = makeTable({
      namespace: "raw",
      name: "access_artifacts",
      current_snapshot_id: 9876543210,
      snapshot_count: 5,
    });
    const result = buildLakeTableNodes(makeStatus([table]));
    assert.equal(result[0].kind, "lakeTable");
    if (result[0].kind !== "lakeTable") return; // type-narrow
    assert.ok(
      result[0].description.includes("9876543210"),
      `expected snapshot id in description: ${result[0].description}`,
    );
    assert.ok(
      result[0].description.includes("5"),
      `expected snapshot count in description: ${result[0].description}`,
    );
  });

  it("table with current_snapshot_id === null → label says 'no snapshots'", () => {
    const table = makeTable({ current_snapshot_id: null, snapshot_count: 0 });
    const result = buildLakeTableNodes(makeStatus([table]));
    assert.equal(result[0].kind, "lakeTable");
    if (result[0].kind !== "lakeTable") return;
    assert.ok(
      result[0].description.includes("no snapshots"),
      `expected 'no snapshots' in description: ${result[0].description}`,
    );
  });
});

describe("buildLakeErrorNode", () => {
  it("wraps message with 'Error:' prefix", () => {
    const node = buildLakeErrorNode("fetch failed");
    assert.equal(node.kind, "lakeError");
    assert.ok(node.label.includes("fetch failed"));
  });
});

// ─── buildLakeBatchNodes ──────────────────────────────────────────────────────

function makeBatch(overrides: Partial<LakeBatchFromApi> = {}): LakeBatchFromApi {
  return {
    id: "aabbccdd-1234-5678-abcd-aabbccddeeff",
    dataset_type: "access_artifacts",
    storage_provider: null,
    storage_key: null,
    row_count: 42,
    created_at: "2026-04-27T10:00:00Z",
    application_id: null,
    task_id: null,
    content_type: null,
    metadata_json: null,
    iceberg_namespace: "raw",
    iceberg_table: "access_artifacts",
    snapshot_id: "1234567890123456789",
    ...overrides,
  };
}

describe("buildLakeBatchNodes", () => {
  it("empty list → [sectionHeader, placeholder]", () => {
    const result = buildLakeBatchNodes([]);
    assert.equal(result.length, 2);
    assert.equal(result[0].kind, "lakeSectionHeader");
    assert.equal(result[1].kind, "lakePlaceholder");
    assert.equal((result[1] as { kind: string; label: string }).label, "No recent batches");
  });

  it("one batch → [sectionHeader, batchNode]; description matches pattern", () => {
    const result = buildLakeBatchNodes([makeBatch()]);
    assert.equal(result.length, 2);
    assert.equal(result[0].kind, "lakeSectionHeader");
    assert.equal(result[1].kind, "lakeBatch");
    const batchNode = result[1] as { kind: string; description: string };
    // description: "access_artifacts · 42 rows · snapshot 1234567890123456789"
    assert.ok(
      batchNode.description.includes("access_artifacts"),
      `expected dataset in description: ${batchNode.description}`,
    );
    assert.ok(
      batchNode.description.includes("42 rows"),
      `expected row count in description: ${batchNode.description}`,
    );
    assert.ok(
      batchNode.description.includes("snapshot 1234567890123456789"),
      `expected snapshot in description: ${batchNode.description}`,
    );
  });

  it("two batches → [sectionHeader, batchNode, batchNode]", () => {
    const result = buildLakeBatchNodes([makeBatch(), makeBatch({ id: "bbbbcccc-1234-5678-abcd-aabbccddeeff" })]);
    assert.equal(result.length, 3);
    assert.equal(result[0].kind, "lakeSectionHeader");
    assert.equal(result[1].kind, "lakeBatch");
    assert.equal(result[2].kind, "lakeBatch");
  });

  it("null snapshot_id (legacy file batch) → no snapshot suffix in description", () => {
    const result = buildLakeBatchNodes([
      makeBatch({ iceberg_namespace: null, iceberg_table: null, snapshot_id: null }),
    ]);
    const batchNode = result[1] as { kind: string; description: string };
    assert.equal(batchNode.kind, "lakeBatch");
    assert.ok(
      !batchNode.description.includes("snapshot"),
      `expected no snapshot suffix: ${batchNode.description}`,
    );
  });

  it("tooltip is multi-line with created_at, dataset, namespace.table, snapshot", () => {
    const result = buildLakeBatchNodes([makeBatch()]);
    const batchNode = result[1] as { kind: string; tooltip: string };
    assert.ok(batchNode.tooltip.includes("2026-04-27T10:00:00Z"), "tooltip has created_at");
    assert.ok(batchNode.tooltip.includes("access_artifacts"), "tooltip has dataset");
    assert.ok(batchNode.tooltip.includes("raw.access_artifacts"), "tooltip has namespace.table");
    assert.ok(batchNode.tooltip.includes("1234567890123456789"), "tooltip has snapshot");
  });
});
