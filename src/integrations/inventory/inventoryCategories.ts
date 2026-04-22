/**
 * Declarative registry of all 15 inventory categories.
 * No `vscode` import — pure, unit-testable via `node --test`.
 */

export type InventoryCategoryKey =
  | "customers"
  | "subjects"
  | "accounts"
  | "resources"
  | "accessArtifacts"
  | "accessFacts"
  | "artifactBindings"
  | "initiatives"
  | "ownershipAssignments"
  | "accessUsageFacts"
  | "threatFacts"
  | "persons"
  | "employees"
  | "nhi"
  | "employeeRecords";

export type InventoryCategoryFetcherName =
  | "fetchCustomers"
  | "fetchSubjects"
  | "fetchAccounts"
  | "fetchResources"
  | "fetchAccessArtifacts"
  | "fetchAccessFacts"
  | "fetchArtifactBindings"
  | "fetchInitiatives"
  | "fetchOwnershipAssignments"
  | "fetchAccessUsageFacts"
  | "fetchThreatFacts"
  | "fetchPersons"
  | "fetchEmployees"
  | "fetchNHIs"
  | "fetchEmployeeRecords";

export type InventoryCategoryDef = {
  key: InventoryCategoryKey;
  label: string;
  fetcherName: InventoryCategoryFetcherName;
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

export const INVENTORY_CATEGORIES: InventoryCategoryDef[] = [
  {
    key: "customers",
    label: "Customers",
    fetcherName: "fetchCustomers",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["external_id"]),
      desc: (row) => str(r(row)["plan_tier"] ?? r(row)["tenant_role"] ?? ""),
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "subjects",
    label: "Subjects",
    fetcherName: "fetchSubjects",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["external_id"]),
      desc: (row) => str(r(row)["kind"]) + (r(row)["nhi_kind"] ? `/${str(r(row)["nhi_kind"])}` : ""),
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "accounts",
    label: "Accounts",
    fetcherName: "fetchAccounts",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["username"]),
      desc: (row) => str(r(row)["status"]),
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "resources",
    label: "Resources",
    fetcherName: "fetchResources",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["external_id"]),
      desc: (row) => str(r(row)["kind"]),
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "accessArtifacts",
    label: "Access Artifacts",
    fetcherName: "fetchAccessArtifacts",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["external_id"]),
      desc: (row) => str(r(row)["source_kind"]),
      ts: (row) => str(r(row)["ingested_at"]),
    },
  },
  {
    key: "accessFacts",
    label: "Access Facts",
    fetcherName: "fetchAccessFacts",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["subject_id"]),
      desc: (row) => `${str(r(row)["action"])} / ${str(r(row)["effect"])}`,
      ts: (row) => str(r(row)["created_at"]),
    },
  },
  {
    key: "artifactBindings",
    label: "Artifact Bindings",
    fetcherName: "fetchArtifactBindings",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["artifact_id"]),
      desc: (row) => str(r(row)["account_id"] ?? r(row)["resource_id"] ?? ""),
      ts: (row) => str(r(row)["created_at"]),
    },
  },
  {
    key: "initiatives",
    label: "Initiatives",
    fetcherName: "fetchInitiatives",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["access_fact_id"]),
      desc: (row) => str(r(row)["type"]),
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "ownershipAssignments",
    label: "Ownership Assignments",
    fetcherName: "fetchOwnershipAssignments",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["subject_id"]),
      desc: (row) => str(r(row)["kind"]),
      ts: (row) => str(r(row)["created_at"]),
    },
  },
  {
    key: "accessUsageFacts",
    label: "Access Usage Facts",
    fetcherName: "fetchAccessUsageFacts",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["access_fact_id"]),
      desc: (row) => `count: ${str(r(row)["usage_count"])}`,
      ts: (row) => str(r(row)["created_at"]),
    },
  },
  {
    key: "threatFacts",
    label: "Threat Facts",
    fetcherName: "fetchThreatFacts",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["subject_id"]),
      desc: (row) => `risk: ${str(r(row)["risk_score"])}`,
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "persons",
    label: "Persons",
    fetcherName: "fetchPersons",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["external_id"]),
      desc: (row) => str(r(row)["status"] ?? ""),
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "employees",
    label: "Employees",
    fetcherName: "fetchEmployees",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["external_id"]),
      desc: (row) => str(r(row)["status"] ?? ""),
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "nhi",
    label: "Non-Human Identities",
    fetcherName: "fetchNHIs",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["external_id"]),
      desc: (row) => `${str(r(row)["nhi_kind"] ?? "")} / ${str(r(row)["status"] ?? "")}`,
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
  {
    key: "employeeRecords",
    label: "Employee Records",
    fetcherName: "fetchEmployeeRecords",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["external_id"]),
      desc: (row) => str(r(row)["employee_id"] ?? ""),
      ts: (row) => str(r(row)["updated_at"]),
    },
  },
];
