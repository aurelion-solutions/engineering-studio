/**
 * Declarative registry of all 14 inventory categories.
 * No `vscode` import — pure, unit-testable via `node --test`.
 */

export type InventoryCategoryKey =
  | "customers"
  | "subjects"
  | "accountState"
  | "resources"
  | "accessState"
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
  | "fetchAccountsForState"
  | "fetchAccountIncomingDeltaItems"
  | "fetchAccountOutgoingPlanItems"
  | "fetchResources"
  | "fetchAccessFactsForState"
  | "fetchIncomingDeltaItems"
  | "fetchOutgoingPlanItems"
  | "fetchArtifactBindings"
  | "fetchInitiatives"
  | "fetchOwnershipAssignments"
  | "fetchAccessUsageFacts"
  | "fetchThreatFacts"
  | "fetchPersons"
  | "fetchEmployees"
  | "fetchNHIs"
  | "fetchEmployeeRecords";

/** A rich cell with optional CSS class and tooltip. */
export type RichCell = {
  text: string;
  cssClass?: string;
  tooltip?: string;
};

/** Column definition set for a single tab within an Access State category. */
export type AccessStateTabColumns = {
  id: (row: unknown) => string;
  name: (row: unknown) => string;
  desc: (row: unknown) => string;
  ts: (row: unknown) => string;
};

/** Rich column builder for Access State tabs — returns RichCell[] per row. */
export type AccessStateRichRowBuilder = (row: unknown) => RichCell[];

/** A single tab in the Access State multi-tab category. */
export type AccessStateTab = {
  key: "list" | "incoming" | "outgoing";
  label: string;
  fetcherName: InventoryCategoryFetcherName;
  columns: AccessStateTabColumns;
  /** Column header labels for the rich renderer (Op · Subject · Target · ...). */
  richHeaders: string[];
  /** Rich row builder returning styled cells. */
  buildRichRow: AccessStateRichRowBuilder;
};

/** Base category definition for regular (single-table) categories. */
export type RegularInventoryCategoryDef = {
  key: Exclude<InventoryCategoryKey, "accessState" | "accountState">;
  label: string;
  fetcherName: InventoryCategoryFetcherName;
  columns: AccessStateTabColumns;
  tabs?: undefined;
};

/** Multi-tab category definition for Access State. */
export type AccessStateCategoryDef = {
  key: "accessState";
  label: string;
  fetcherName?: undefined;
  columns?: undefined;
  tabs: AccessStateTab[];
};

/** A single tab in the Account State multi-tab category. */
export type AccountStateTabKey = "list" | "incoming" | "outgoing";

export type AccountStateTab = {
  key: AccountStateTabKey;
  label: string;
  fetcherName: InventoryCategoryFetcherName;
  columns: AccessStateTabColumns;
  richHeaders: string[];
  buildRichRow: AccessStateRichRowBuilder;
};

/** Multi-tab category definition for Account State. */
export type AccountStateCategoryDef = {
  key: "accountState";
  label: string;
  fetcherName?: undefined;
  columns?: undefined;
  tabs: AccountStateTab[];
};

export type InventoryCategoryDef = RegularInventoryCategoryDef | AccessStateCategoryDef | AccountStateCategoryDef;

function r(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function str(v: unknown): string {
  return v !== null && v !== undefined ? String(v) : "";
}

/** Compact one-line JSON for target_descriptor / payload fields. */
function compactJson(v: unknown): string {
  if (v === null || v === undefined) { return ""; }
  if (typeof v === "string") { return v; }
  try { return JSON.stringify(v); } catch { return String(v); }
}

/** Shorten a UUID-like string to 8 chars + ellipsis. */
function shortId(v: unknown): string {
  const s = str(v);
  return s.length > 8 ? s.slice(0, 8) + "…" : s;
}

/**
 * Format ISO datetime: HH:mm:ss if today (local), else MM-DD HH:mm.
 * Falls back to original string on parse error.
 */
function formatTime(v: unknown): string {
  const s = str(v);
  if (!s) { return ""; }
  try {
    const d = new Date(s);
    const now = new Date();
    const today =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    if (today) {
      return `${hh}:${mm}:${ss}`;
    }
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mo}-${dd} ${hh}:${mm}`;
  } catch {
    return s;
  }
}

/** Map operation string to CSS class. */
function opClass(op: string): string {
  switch (op) {
    case "create": return "op-create";
    case "revoke": return "op-revoke";
    case "update": return "op-update";
    case "reactivate": return "op-reactivate";
    case "noop": return "op-noop";
    default: return "";
  }
}

/** Map operation to short glyph prefix. */
function opGlyph(op: string): string {
  switch (op) {
    case "create": return "+ ";
    case "revoke": return "– ";
    case "update": return "✎ ";
    case "reactivate": return "↻ ";
    case "noop": return "○ ";
    default: return "";
  }
}

/** Abbreviate plan item kind to compact display. */
function abbreviateKind(kind: string): string {
  const map: Record<string, string> = {
    account_create: "+account",
    account_disable: "⊘account",
    account_enable: "↻account",
    account_delete: "-account",
    account_invite: "+invite",
    account_activate: "↻activate",
    account_suspend: "⏸suspend",
    grant_role: "+role",
    revoke_role: "-role",
    group_add: "+group",
    group_remove: "-group",
  };
  return map[kind] ?? kind;
}

/** CSS class for execution_status. */
function execClass(status: string): string {
  switch (status) {
    case "proposed": return "exec-proposed";
    case "executing": return "exec-executing";
    case "done": return "exec-done";
    case "failed": return "exec-failed";
    default: return "";
  }
}

// ─── Rich row builders ────────────────────────────────────────────────────────

function buildIncomingRichRow(row: unknown): RichCell[] {
  const d = r(row);
  const op = str(d["operation"]);
  const appText = str(d["application_name"] ?? d["application_code"] ?? "—");
  const subjectFull = str(d["subject_display"] ?? d["account_display"] ?? d["subject_id"] ?? d["account_id"] ?? "");
  const subjectText =
    d["subject_display"] != null
      ? str(d["subject_display"])
      : d["account_display"] != null
      ? str(d["account_display"])
      : shortId(d["subject_id"] ?? d["account_id"] ?? "—");
  const subjectTooltip = subjectFull !== subjectText ? subjectFull : undefined;
  const resourceFull = str(d["resource_display"] ?? d["resource_id"] ?? "");
  const resourceText =
    d["resource_display"] != null
      ? str(d["resource_display"])
      : shortId(d["resource_id"] ?? "—");
  const resourceTooltip = resourceFull !== resourceText ? resourceFull : undefined;
  return [
    { text: appText },
    { text: opGlyph(op) + op, cssClass: opClass(op), tooltip: op },
    { text: subjectText || "—", cssClass: "uuid-short", tooltip: subjectTooltip },
    { text: resourceText || "—", cssClass: "uuid-short", tooltip: resourceTooltip },
    { text: str(d["change_summary"] ?? "—") },
    { text: formatTime(d["created_at"]), cssClass: "ts" },
  ];
}

function buildOutgoingRichRow(row: unknown): RichCell[] {
  const d = r(row);
  const kind = str(d["kind"]);
  const status = str(d["execution_status"]);
  const appText = str(d["application_name"] ?? d["application_code"] ?? d["application"] ?? "—");
  const subjectText =
    d["subject_display"] != null
      ? str(d["subject_display"])
      : shortId(d["subject_ref"] ?? "—");
  const subjectTooltip = d["subject_display"] == null && d["subject_ref"] != null
    ? str(d["subject_ref"])
    : undefined;
  return [
    { text: appText },
    { text: abbreviateKind(kind), tooltip: kind },
    { text: status, cssClass: execClass(status) },
    { text: subjectText || "—", cssClass: "uuid-short", tooltip: subjectTooltip },
    { text: str(d["target_display"] ?? "—") },
    { text: str(d["change_summary"] ?? "—") },
    { text: formatTime(d["created_at"]), cssClass: "ts" },
  ];
}

function buildListRichRow(row: unknown): RichCell[] {
  const d = r(row);
  const appText = str(d["application_name"] ?? d["application_code"] ?? "—");
  const subjectText =
    d["subject_display"] != null
      ? str(d["subject_display"])
      : shortId(d["subject_id"] ?? "—");
  const subjectTooltip = d["subject_display"] == null && d["subject_id"] != null
    ? str(d["subject_id"])
    : undefined;
  const accountText =
    d["account_display"] != null
      ? str(d["account_display"])
      : d["account_id"] != null
      ? shortId(d["account_id"])
      : "—";
  const accountTooltip = d["account_display"] == null && d["account_id"] != null
    ? str(d["account_id"])
    : undefined;
  const resourceText =
    d["resource_display"] != null
      ? str(d["resource_display"])
      : shortId(d["resource_id"] ?? "—");
  const resourceTooltip = d["resource_display"] == null && d["resource_id"] != null
    ? str(d["resource_id"])
    : undefined;
  const actionSlug = str(d["action_slug"] ?? d["action"] ?? "");
  const effect = str(d["effect"] ?? "");
  const isActive = d["is_active"];
  const activeText = isActive === true ? "●" : isActive === false ? "○" : "—";
  const activeTooltip = isActive === false && d["valid_until"]
    ? `revoked at ${str(d["valid_until"])}`
    : undefined;
  return [
    { text: appText },
    { text: subjectText || "—", cssClass: "uuid-short", tooltip: subjectTooltip },
    { text: accountText, cssClass: "uuid-short", tooltip: accountTooltip },
    { text: resourceText || "—", cssClass: "uuid-short", tooltip: resourceTooltip },
    { text: actionSlug || "—" },
    { text: effect || "—", cssClass: effect ? `badge-effect-${effect}` : undefined },
    { text: activeText, tooltip: activeTooltip },
  ];
}

// ─── Account State rich row builders ─────────────────────────────────────────

/** Badge text + CSS class for account status values. */
function accountStatusBadge(status: string): { text: string; cssClass: string } {
  switch (status) {
    case "active":    return { text: "active",    cssClass: "badge-status-active" };
    case "suspended": return { text: "suspended", cssClass: "badge-status-suspended" };
    case "disabled":  return { text: "disabled",  cssClass: "badge-status-disabled" };
    case "invited":   return { text: "invited",   cssClass: "badge-status-invited" };
    default:          return { text: status || "—", cssClass: "" };
  }
}

function buildAccountListRichRow(row: unknown): RichCell[] {
  const d = r(row);
  const appText = str(d["application_name"] ?? d["application_code"] ?? d["application_id"] ?? "—");
  const username = str(d["username"] ?? d["display_name"] ?? "—");
  const status = str(d["status"] ?? "");
  const badge = accountStatusBadge(status);
  const mfaEnabled = d["mfa_enabled"];
  const mfaText = mfaEnabled === true ? "●" : mfaEnabled === false ? "○" : "—";
  const privileged = d["is_privileged"];
  const privText = privileged === true ? "●" : privileged === false ? "○" : "—";
  const subjectFull = str(d["subject_display"] ?? d["subject_id"] ?? "");
  const subjectText =
    d["subject_display"] != null
      ? str(d["subject_display"])
      : d["subject_id"] != null
      ? shortId(d["subject_id"])
      : "—";
  const subjectTooltip = d["subject_display"] == null && d["subject_id"] != null
    ? str(d["subject_id"])
    : subjectFull !== subjectText ? subjectFull : undefined;
  return [
    { text: appText },
    { text: username },
    { text: badge.text, cssClass: badge.cssClass || undefined },
    { text: mfaText },
    { text: privText },
    { text: subjectText || "—", cssClass: "uuid-short", tooltip: subjectTooltip },
    { text: formatTime(d["updated_at"] ?? d["created_at"]), cssClass: "ts" },
  ];
}

function buildAccountIncomingRichRow(row: unknown): RichCell[] {
  const d = r(row);
  const op = str(d["operation"]);
  const appText = str(d["application_name"] ?? d["application_code"] ?? "—");
  const accountFull = str(d["account_display"] ?? d["account_id"] ?? d["entity_id"] ?? "");
  const accountText =
    d["account_display"] != null
      ? str(d["account_display"])
      : d["account_id"] != null
      ? shortId(d["account_id"])
      : d["entity_id"] != null
      ? shortId(d["entity_id"])
      : "—";
  const accountTooltip = d["account_display"] == null && (d["account_id"] ?? d["entity_id"]) != null
    ? str(d["account_id"] ?? d["entity_id"])
    : accountFull !== accountText ? accountFull : undefined;
  return [
    { text: appText },
    { text: opGlyph(op) + op, cssClass: opClass(op), tooltip: op },
    { text: accountText, cssClass: "uuid-short", tooltip: accountTooltip },
    { text: str(d["change_summary"] ?? "—") },
    { text: formatTime(d["created_at"]), cssClass: "ts" },
  ];
}

function buildAccountOutgoingRichRow(row: unknown): RichCell[] {
  const d = r(row);
  const kind = str(d["kind"]);
  const status = str(d["execution_status"]);
  const appText = str(d["application_name"] ?? d["application_code"] ?? d["application"] ?? "—");
  const subjectText =
    d["subject_display"] != null
      ? str(d["subject_display"])
      : shortId(d["subject_ref"] ?? "—");
  const subjectTooltip = d["subject_display"] == null && d["subject_ref"] != null
    ? str(d["subject_ref"])
    : undefined;
  return [
    { text: appText },
    { text: abbreviateKind(kind), tooltip: kind },
    { text: status, cssClass: execClass(status) },
    { text: subjectText || "—", cssClass: "uuid-short", tooltip: subjectTooltip },
    { text: str(d["target_display"] ?? "—") },
    { text: str(d["change_summary"] ?? "—") },
    { text: formatTime(d["created_at"]), cssClass: "ts" },
  ];
}

const ACCOUNT_STATE_LIST_COLUMNS: AccessStateTabColumns = {
  id: (row) => str(r(row)["id"]),
  name: (row) => str(r(row)["username"] ?? r(row)["display_name"] ?? ""),
  desc: (row) => str(r(row)["status"]),
  ts: (row) => str(r(row)["updated_at"] ?? r(row)["created_at"]),
};

const ACCOUNT_STATE_INCOMING_COLUMNS: AccessStateTabColumns = {
  id: (row) => str(r(row)["id"]),
  name: (row) => str(r(row)["account_display"] ?? r(row)["account_id"] ?? r(row)["entity_id"] ?? ""),
  desc: (row) => `${str(r(row)["operation"])} / ${str(r(row)["entity_type"])} / ${str(r(row)["status"])}`,
  ts: (row) => str(r(row)["created_at"]),
};

const ACCOUNT_STATE_OUTGOING_COLUMNS: AccessStateTabColumns = {
  id: (row) => str(r(row)["id"]),
  name: (row) => `${str(r(row)["kind"])} / ${str(r(row)["application_code"] ?? r(row)["application"])}`,
  desc: (row) => `${str(r(row)["target_display"] ?? "")} / ${str(r(row)["execution_status"])}`,
  ts: (row) => str(r(row)["created_at"]),
};

// ─── Access State column defs (existing) ─────────────────────────────────────

const ACCESS_STATE_LIST_COLUMNS: AccessStateTabColumns = {
  id: (row) => str(r(row)["id"]),
  name: (row) => str(r(row)["subject_display"] ?? r(row)["subject_id"] ?? ""),
  desc: (row) => `${str(r(row)["action_slug"] ?? r(row)["action"])} / ${str(r(row)["effect"])}`,
  ts: (row) => str(r(row)["created_at"]),
};

const ACCESS_STATE_INCOMING_COLUMNS: AccessStateTabColumns = {
  id: (row) => str(r(row)["id"]),
  name: (row) => str(r(row)["subject_display"] ?? r(row)["account_display"] ?? r(row)["subject_id"] ?? r(row)["account_id"] ?? r(row)["resource_id"] ?? ""),
  desc: (row) => `${str(r(row)["operation"])} / ${str(r(row)["entity_type"])} / ${str(r(row)["status"])} / run:${shortId(r(row)["run_id"])}`,
  ts: (row) => str(r(row)["created_at"]),
};

const ACCESS_STATE_OUTGOING_COLUMNS: AccessStateTabColumns = {
  id: (row) => str(r(row)["id"]),
  name: (row) => `${str(r(row)["kind"])} / ${str(r(row)["application_code"] ?? r(row)["application"])}`,
  desc: (row) => `${compactJson(r(row)["target_display"] ?? r(row)["target_descriptor"])} / plan:${shortId(r(row)["plan_id"])} / ${str(r(row)["execution_status"])}`,
  ts: (row) => str(r(row)["created_at"]),
};

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
    key: "accountState",
    label: "Accounts",
    tabs: [
      {
        key: "list",
        label: "List",
        fetcherName: "fetchAccountsForState",
        columns: ACCOUNT_STATE_LIST_COLUMNS,
        richHeaders: ["Application", "Username", "Status", "MFA", "Privileged", "Subject", "Updated"],
        buildRichRow: buildAccountListRichRow,
      },
      {
        key: "incoming",
        label: "Incoming",
        fetcherName: "fetchAccountIncomingDeltaItems",
        columns: ACCOUNT_STATE_INCOMING_COLUMNS,
        richHeaders: ["Application", "Op", "Account/Target", "Change", "Time"],
        buildRichRow: buildAccountIncomingRichRow,
      },
      {
        key: "outgoing",
        label: "Outgoing",
        fetcherName: "fetchAccountOutgoingPlanItems",
        columns: ACCOUNT_STATE_OUTGOING_COLUMNS,
        richHeaders: ["Application", "Kind", "Status", "Subject", "Target", "Change", "Time"],
        buildRichRow: buildAccountOutgoingRichRow,
      },
    ],
  } as AccountStateCategoryDef,
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
    key: "accessState",
    label: "Access State",
    tabs: [
      {
        key: "list",
        label: "List",
        fetcherName: "fetchAccessFactsForState",
        columns: ACCESS_STATE_LIST_COLUMNS,
        richHeaders: ["Application", "Subject", "Account", "Resource", "Action", "Effect", "Active"],
        buildRichRow: buildListRichRow,
      },
      {
        key: "incoming",
        label: "Incoming",
        fetcherName: "fetchIncomingDeltaItems",
        columns: ACCESS_STATE_INCOMING_COLUMNS,
        richHeaders: ["Application", "Op", "Subject", "Target", "Change", "Time"],
        buildRichRow: buildIncomingRichRow,
      },
      {
        key: "outgoing",
        label: "Outgoing",
        fetcherName: "fetchOutgoingPlanItems",
        columns: ACCESS_STATE_OUTGOING_COLUMNS,
        richHeaders: ["Application", "Kind", "Status", "Subject", "Target", "Change", "Time"],
        buildRichRow: buildOutgoingRichRow,
      },
    ],
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
      desc: (row) => str(r(row)["full_name"]),
      ts: () => "",
    },
  },
  {
    key: "employees",
    label: "Employees",
    fetcherName: "fetchEmployees",
    columns: {
      id: (row) => str(r(row)["id"]),
      name: (row) => str(r(row)["_person_full_name"]),
      desc: (row) => (r(row)["is_locked"] ? "locked" : ""),
      ts: () => "",
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
