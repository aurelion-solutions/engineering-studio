import type { LakeBatchFromApi, LakeStatusFromApi, LakeTableStatusFromApi } from "../../api/types";

// ─── Data shapes (pure, no vscode dependency) ────────────────────────────────

export type LakeTableNodeData = {
  readonly kind: "lakeTable";
  /** Full qualified label, e.g. "raw.access_artifacts" */
  readonly label: string;
  /** Description shown next to label in the tree. */
  readonly description: string;
  /** Tooltip with all details. */
  readonly tooltip: string;
};

export type LakePlaceholderNodeData = {
  readonly kind: "lakePlaceholder";
  readonly label: string;
};

export type LakeErrorNodeData = {
  readonly kind: "lakeError";
  readonly label: string;
};

export type LakeBatchNodeData = {
  readonly kind: "lakeBatch";
  readonly label: string;
  readonly description: string;
  readonly tooltip: string;
};

export type LakeSectionHeaderNodeData = {
  readonly kind: "lakeSectionHeader";
  readonly label: string;
};

export type LakeNodeData =
  | LakeTableNodeData
  | LakePlaceholderNodeData
  | LakeErrorNodeData
  | LakeBatchNodeData
  | LakeSectionHeaderNodeData;

// ─── Builders ────────────────────────────────────────────────────────────────

function buildTableNodeData(table: LakeTableStatusFromApi): LakeTableNodeData {
  const qualifiedName = `${table.namespace}.${table.name}`;

  let snapshotPart: string;
  if (table.current_snapshot_id === null) {
    // TODO(18b): int64 precision loss — snapshot_id rendered via String()
    snapshotPart = "no snapshots";
  } else {
    // TODO(18b): int64 precision loss — rendering via String() to preserve digits
    snapshotPart = `snapshot ${String(table.current_snapshot_id)}`;
  }

  const countPart = `${table.snapshot_count} snapshot${table.snapshot_count === 1 ? "" : "s"}`;

  const lastUpdated =
    table.last_updated_ms !== null
      ? new Date(table.last_updated_ms).toISOString()
      : "unknown";

  return {
    kind: "lakeTable",
    label: qualifiedName,
    description: `${snapshotPart} · ${countPart}`,
    tooltip: [
      `Table: ${qualifiedName}`,
      `Current snapshot: ${table.current_snapshot_id !== null ? String(table.current_snapshot_id) : "none"}`,
      `Snapshot count: ${table.snapshot_count}`,
      `Last updated: ${lastUpdated}`,
    ].join("\n"),
  };
}

/**
 * Build node data objects from a LakeStatusFromApi response.
 * Returns a single placeholder node when the table list is empty.
 * Pure function — no vscode dependency.
 */
export function buildLakeTableNodes(status: LakeStatusFromApi): LakeNodeData[] {
  if (status.tables.length === 0) {
    return [{ kind: "lakePlaceholder", label: "No lake tables" }];
  }
  return status.tables.map(buildTableNodeData);
}

/**
 * Returns a single error node. Used by the provider on fetch failure.
 */
export function buildLakeErrorNode(message: string): LakeErrorNodeData {
  return { kind: "lakeError", label: `Error: ${message}` };
}

// ─── Batch node builders ──────────────────────────────────────────────────────

function buildBatchNodeData(batch: LakeBatchFromApi): LakeBatchNodeData {
  const datasetPart = batch.dataset_type;
  const rowsPart = `${batch.row_count} rows`;

  let snapshotPart: string | undefined;
  if (batch.snapshot_id !== null && batch.snapshot_id !== undefined) {
    snapshotPart = `snapshot ${batch.snapshot_id}`;
  }

  const descParts = [datasetPart, rowsPart];
  if (snapshotPart !== undefined) {
    descParts.push(snapshotPart);
  }

  const qualifiedTable =
    batch.iceberg_namespace !== null &&
    batch.iceberg_namespace !== undefined &&
    batch.iceberg_table !== null &&
    batch.iceberg_table !== undefined
      ? `${batch.iceberg_namespace}.${batch.iceberg_table}`
      : null;

  const tooltipLines = [
    `Created: ${batch.created_at}`,
    `Dataset: ${batch.dataset_type}`,
  ];
  if (qualifiedTable !== null) {
    tooltipLines.push(`Table: ${qualifiedTable}`);
  }
  if (batch.snapshot_id !== null && batch.snapshot_id !== undefined) {
    tooltipLines.push(`Snapshot: ${batch.snapshot_id}`);
  }

  return {
    kind: "lakeBatch",
    label: batch.id,
    description: descParts.join(" · "),
    tooltip: tooltipLines.join("\n"),
  };
}

/** Section header node data — flat sibling, non-interactive. */
export function buildLakeSectionHeader(label: string): LakeSectionHeaderNodeData {
  return { kind: "lakeSectionHeader", label };
}

/**
 * Build node data objects for the Recent batches section.
 * Always starts with a section header node, then either batch nodes or a
 * placeholder when the list is empty. Pure function — no vscode dependency.
 */
export function buildLakeBatchNodes(batches: readonly LakeBatchFromApi[]): LakeNodeData[] {
  const header = buildLakeSectionHeader("Recent batches");
  if (batches.length === 0) {
    return [header, { kind: "lakePlaceholder", label: "No recent batches" }];
  }
  return [header, ...batches.map(buildBatchNodeData)];
}
