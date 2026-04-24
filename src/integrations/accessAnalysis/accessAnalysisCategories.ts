/**
 * Declarative registry of all 8 access analysis categories.
 * No `vscode` import — pure, unit-testable via `node --test`.
 */

export type AccessAnalysisCategoryKey =
  | "capabilities"
  | "capabilityMappings"
  | "capabilityGrants"
  | "sodRules"
  | "findings"
  | "mitigations"
  | "scanRuns"
  | "feedbacks";

export type AccessAnalysisCategoryFetcherName =
  | "fetchCapabilities"
  | "fetchCapabilityMappings"
  | "fetchCapabilityGrants"
  | "fetchSodRules"
  | "fetchFindings"
  | "fetchMitigations"
  | "fetchScanRuns"
  | "fetchFeedbacks";

export type AccessAnalysisCategoryDef = {
  key: AccessAnalysisCategoryKey;
  label: string;
  fetcherName: AccessAnalysisCategoryFetcherName;
  columns: {
    id: (row: unknown) => string;
    name: (row: unknown) => string;
    desc: (row: unknown) => string;
    ts: (row: unknown) => string;
  };
};

function r(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function str(v: unknown): string {
  return v !== null && v !== undefined ? String(v) : "";
}

export const ACCESS_ANALYSIS_CATEGORIES: AccessAnalysisCategoryDef[] = [
  {
    key: "capabilities",
    label: "Capabilities",
    fetcherName: "fetchCapabilities",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["slug"]),
      desc: (row) => str(r(row)["name"] ?? ""),
      ts: (row) => str(r(row)["created_at"]),
    },
  },
  {
    key: "capabilityMappings",
    label: "Capability Mappings",
    fetcherName: "fetchCapabilityMappings",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["capability_id"]),
      desc: (row) => str(r(row)["resource_id"] ?? r(row)["resource_kind"] ?? r(row)["resource_path_glob"] ?? ""),
      ts: (row) => str(r(row)["created_at"]),
    },
  },
  {
    key: "capabilityGrants",
    label: "Capability Grants",
    fetcherName: "fetchCapabilityGrants",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["subject_id"]),
      desc: (row) => str(r(row)["capability_id"]),
      ts: (row) => str(r(row)["observed_at"]),
    },
  },
  {
    key: "sodRules",
    label: "SoD Rules",
    fetcherName: "fetchSodRules",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["code"]),
      desc: (row) => str(r(row)["name"] ?? ""),
      ts: (row) => str(r(row)["created_at"]),
    },
  },
  {
    key: "findings",
    label: "Findings",
    fetcherName: "fetchFindings",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["rule_id"] ?? ""),
      desc: (row) => `${str(r(row)["severity"])} / ${str(r(row)["status"])}`,
      ts: (row) => str(r(row)["detected_at"]),
    },
  },
  {
    key: "mitigations",
    label: "Mitigations",
    fetcherName: "fetchMitigations",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["rule_id"]),
      desc: (row) => str(r(row)["status"]),
      ts: (row) => str(r(row)["created_at"]),
    },
  },
  {
    key: "scanRuns",
    label: "Scan Runs",
    fetcherName: "fetchScanRuns",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["triggered_by"] ?? r(row)["id"] ?? ""),
      desc: (row) => str(r(row)["status"]),
      ts: (row) => str(r(row)["started_at"] ?? r(row)["created_at"] ?? ""),
    },
  },
  {
    key: "feedbacks",
    label: "Feedback",
    fetcherName: "fetchFeedbacks",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["kind"]),
      desc: (row) => str(r(row)["message"] ?? ""),
      ts: (row) => str(r(row)["created_at"]),
    },
  },
];
