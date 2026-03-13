/** GET /api/v0/applications */
export type ApplicationFromApi = {
  id: string;
  name: string;
  code: string;
  config: Record<string, unknown>;
  required_connector_tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** POST /api/v0/applications body */
export type ApplicationCreatePayload = {
  name: string;
  code: string;
  config?: Record<string, unknown>;
  required_connector_tags?: string[];
  is_active?: boolean;
};

/** PATCH /api/v0/applications/{id} body */
export type ApplicationPatchPayload = {
  name?: string;
  code?: string;
  config?: Record<string, unknown>;
  required_connector_tags?: string[];
  is_active?: boolean;
};

/** GET /applications/{id}/matching-connector-instances */
export type ConnectorInstanceFromApi = {
  id: string;
  instance_id: string;
  tags: string[];
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

/** GET /api/v0/log-buffer */
export type LogBufferEvent = {
  id: string;
  event_id: string;
  event_type: string;
  timestamp: string;
  level: string;
  message: string;
  component: string;
  correlation_id: string;
  causation_id: string | null;
  payload: Record<string, unknown>;
  initiator_type: string;
  initiator_id: string;
  actor_type: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  created_at: string;
};

// ─── Inventory: Customer ────────────────────────────────────────────────────

/** Allowed tenant roles for a customer. */
export type CustomerTenantRole = "admin" | "member" | "viewer";

/** Allowed plan tiers for a customer. */
export type CustomerPlanTier = "free" | "basic" | "pro" | "enterprise";

/** GET /api/v0/customers / GET /api/v0/customers/{id} */
export type CustomerFromApi = {
  id: string;
  external_id: string;
  email_verified: boolean;
  tenant_id: string | null;
  tenant_role: CustomerTenantRole | null;
  plan_tier: CustomerPlanTier | null;
  mfa_enabled: boolean;
  is_locked: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
};

/** POST /api/v0/customers body */
export type CustomerCreatePayload = {
  external_id: string;
  email_verified?: boolean;
  tenant_id?: string | null;
  tenant_role?: CustomerTenantRole | null;
  plan_tier?: CustomerPlanTier | null;
  mfa_enabled?: boolean;
  is_locked?: boolean;
  description?: string | null;
};

/** PATCH /api/v0/customers/{id} body — exactly four patchable fields */
export type CustomerPatchPayload = {
  email_verified?: boolean;
  mfa_enabled?: boolean;
  is_locked?: boolean;
  plan_tier?: CustomerPlanTier;
};

/** GET /api/v0/customers/{id}/attributes */
export type CustomerAttributeFromApi = {
  id: string;
  customer_id: string;
  key: string;
  value: string;
  created_at: string;
};

/** POST /api/v0/customers/{id}/attributes body */
export type CustomerAttributeCreatePayload = {
  key: string;
  value: string;
};

// ─── Inventory: Subject ─────────────────────────────────────────────────────

/** Closed set of principal kinds. Mirrors SubjectKind Python enum verbatim. */
export type SubjectKind = "employee" | "nhi" | "customer";

/** NHI sub-kind. Non-null IFF kind === 'nhi'. */
export type SubjectNHIKind = "service_account" | "api_key" | "bot" | "certificate";

/**
 * Wide union of all three kind-specific status vocabularies.
 * Per-kind correctness is a runtime invariant — not enforced at TypeScript level.
 */
export type SubjectStatus =
  | "hired"
  | "active"
  | "on_leave"
  | "terminated"
  | "expired"
  | "locked"
  | "registered"
  | "verified"
  | "suspended"
  | "banned"
  | "deletion_requested";

/** GET /api/v0/subjects / GET /api/v0/subjects/{id} */
export type SubjectFromApi = {
  id: string;
  external_id: string;
  kind: SubjectKind;
  nhi_kind: SubjectNHIKind | null;
  principal_employee_id: string | null;
  principal_nhi_id: string | null;
  principal_customer_id: string | null;
  status: SubjectStatus;
  created_at: string;
  updated_at: string;
};

/** POST /api/v0/subjects body */
export type SubjectCreatePayload = {
  external_id: string;
  kind: SubjectKind;
  nhi_kind?: SubjectNHIKind;
  principal_employee_id?: string;
  principal_nhi_id?: string;
  principal_customer_id?: string;
  status: SubjectStatus;
};

/** PATCH /api/v0/subjects/{id} body — exactly one patchable field */
export type SubjectPatchPayload = {
  status?: SubjectStatus;
};

/** GET /api/v0/subjects/{id}/attributes */
export type SubjectAttributeFromApi = {
  id: string;
  subject_id: string;
  key: string;
  value: string;
  created_at: string;
};

/** POST /api/v0/subjects/{id}/attributes body */
export type SubjectAttributeCreatePayload = {
  key: string;
  value: string;
};

// ─── Inventory: Resource ────────────────────────────────────────────────────

export type ResourcePrivilegeLevel = "admin" | "write" | "read" | "none";
export type ResourceEnvironment = "production" | "staging" | "dev";
export type ResourceDataSensitivity = "pii" | "financial" | "public";

export type ResourceFromApi = {
  id: string;
  external_id: string;
  application_id: string;
  kind: string;
  parent_id: string | null;
  path: string | null;
  description: string | null;
  privilege_level: ResourcePrivilegeLevel | null;
  environment: ResourceEnvironment | null;
  data_sensitivity: ResourceDataSensitivity | null;
  created_at: string;
  updated_at: string;
};

export type ResourceCreatePayload = {
  external_id: string;
  application_id: string;
  kind: string;
  parent_id?: string;
  path?: string;
  description?: string;
  privilege_level?: ResourcePrivilegeLevel;
  environment?: ResourceEnvironment;
  data_sensitivity?: ResourceDataSensitivity;
};

export type ResourcePatchPayload = {
  kind?: string;
  parent_id?: string | null;
  path?: string | null;
  description?: string | null;
  privilege_level?: ResourcePrivilegeLevel | null;
  environment?: ResourceEnvironment | null;
  data_sensitivity?: ResourceDataSensitivity | null;
};

export type ResourceAttributeFromApi = {
  id: string;
  resource_id: string;
  key: string;
  value: string;
  created_at: string;
};

export type ResourceAttributeCreatePayload = {
  key: string;
  value: string;
};

export type InstalledApplication = {
  id: string;
  name: string;
  tags: string[];
  config: Record<string, unknown>;
};

// ─── Inventory: Account ─────────────────────────────────────────────────────

export type AccountStatus = "active" | "suspended" | "disabled" | "deleted" | "unknown";

/** GET /api/v0/accounts / GET /api/v0/accounts/{id} */
export type AccountFromApi = {
  id: string;
  application_id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  is_active: boolean;
  is_privileged: boolean;
  mfa_enabled: boolean;
  status: AccountStatus;
  subject_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** PATCH /api/v0/accounts/{id} body — exactly two patchable fields */
export type AccountPatchPayload = {
  status?: AccountStatus;
  subject_id?: string;
};

// ─── Inventory: Action ────────────────────────────────────────────────────
export type ActionKind = "read" | "write" | "execute" | "approve" | "administer";

// --- Inventory: AccessArtifact ---

/** Suggestive source kind vocabulary (not exhaustive). */
export type AccessArtifactSourceKind = "sap_role" | "acl_entry" | "db_grant" | "git_permission" | "ad_group";

/** GET /api/v0/access-artifacts / GET /api/v0/access-artifacts/{id} */
export type AccessArtifactFromApi = {
  id: string;
  application_id: string;
  source_kind: string; // open vocabulary, not restricted to AccessArtifactSourceKind
  external_id: string;
  payload: Record<string, unknown>;
  ingested_at: string;
  ingest_batch_id: string | null;
};

// --- Inventory: ArtifactBinding ---

/** GET /api/v0/artifact-bindings / GET /api/v0/artifact-bindings/{id} */
export type ArtifactBindingFromApi = {
  id: string;
  artifact_id: string;
  access_fact_id: string | null;
  resource_id: string | null;
  account_id: string | null;
  created_at: string;
};

// --- Inventory: Initiative ---

export type InitiativeType =
  | "birthright"
  | "requested"
  | "delegated"
  | "inherited"
  | "grace"
  | "self_registered"
  | "invited"
  | "trial"
  | "subscription";

export type InitiativeFromApi = {
  id: string;
  access_fact_id: string;
  type: InitiativeType;
  origin: string;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

export type InitiativeCreatePayload = {
  access_fact_id: string;
  type: InitiativeType;
  origin: string;
  valid_from?: string;
  valid_until?: string | null;
};

export type InitiativePatchPayload = {
  origin?: string;
  valid_from?: string;
  valid_until?: string | null;
};

// --- Inventory: OwnershipAssignment ---

export type OwnershipKind = "primary" | "secondary" | "technical";

export type OwnershipAssignmentFromApi = {
  id: string;
  subject_id: string;
  resource_id: string | null;
  account_id: string | null;
  kind: OwnershipKind;
  created_at: string;
};

export type OwnershipAssignmentCreatePayload = {
  subject_id: string;
  resource_id?: string | null;
  account_id?: string | null;
  kind: OwnershipKind;
};

// --- Inventory: AccessUsageFact ---

/** GET /api/v0/access-usage-facts / GET /api/v0/access-usage-facts/{id} */
export type AccessUsageFactFromApi = {
  id: string;
  access_fact_id: string;
  last_seen: string;
  usage_count: number;
  window_from: string;
  window_to: string | null;
  created_at: string;
};

/** POST /api/v0/access-usage-facts body */
export type AccessUsageFactCreatePayload = {
  access_fact_id: string;
  last_seen: string;
  usage_count: number;
  window_from: string;
  window_to?: string | null;
};

// --- Inventory: ThreatFact ---

/** GET /api/v0/threat-facts / PUT /api/v0/threat-facts/{subject_id} */
export type ThreatFactFromApi = {
  id: string;
  subject_id: string;
  account_id: string | null;
  risk_score: number;
  active_indicators: string[];
  last_login_at: string | null;
  failed_auth_count: number;
  observed_at: string;
  created_at: string;
  updated_at: string;
};

/** PUT /api/v0/threat-facts/{subject_id} body */
export type ThreatFactUpsertPayload = {
  risk_score: number;
  active_indicators?: string[];
  account_id?: string | null;
  last_login_at?: string | null;
  failed_auth_count?: number;
  observed_at?: string | null;
};

// --- Inventory: AccessFact ---

export type AccessFactEffect = "allow" | "deny";

/** GET /api/v0/access-facts / GET /api/v0/access-facts/{id} */
export type AccessFactFromApi = {
  id: string;
  subject_id: string;
  account_id: string | null;
  resource_id: string;
  action: ActionKind;
  effect: AccessFactEffect;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
};
