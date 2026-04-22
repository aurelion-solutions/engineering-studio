import * as vscode from "vscode";
import type {
  AccessArtifactFromApi,
  PlatformEventEntry,
  PlatformLogEntry,
  AccessFactFromApi,
  AccessUsageFactCreatePayload,
  AccessUsageFactFromApi,
  AccountFromApi,
  ArtifactBindingFromApi,
  AccountPatchPayload,
  InitiativeCreatePayload,
  InitiativeFromApi,
  InitiativePatchPayload,
  InitiativeType,
  AccountStatus,
  ApplicationFromApi,
  ApplicationPatchPayload,
  ConnectorInstanceFromApi,
  CustomerAttributeCreatePayload,
  CustomerAttributeFromApi,
  CustomerCreatePayload,
  CustomerFromApi,
  CustomerPatchPayload,
  CustomerPlanTier,
  EmployeeFromApi,
  EmployeeRecordFromApi,
  LogBufferEvent,
  NHIFromApi,
  OwnershipAssignmentCreatePayload,
  OwnershipAssignmentFromApi,
  OwnershipKind,
  PersonFromApi,
  ResourceAttributeCreatePayload,
  ResourceAttributeFromApi,
  ResourceCreatePayload,
  ResourceDataSensitivity,
  ResourceEnvironment,
  ResourceFromApi,
  ResourcePatchPayload,
  ResourcePrivilegeLevel,
  SubjectAttributeCreatePayload,
  SubjectAttributeFromApi,
  SubjectCreatePayload,
  SubjectFromApi,
  SubjectKind,
  SubjectPatchPayload,
  SubjectStatus,
  ThreatFactFromApi,
  ThreatFactUpsertPayload,
} from "./types";

export function getApiBaseUrl(): string {
  const raw = vscode.workspace
    .getConfiguration("aurelion.engineeringStudio")
    .get<string>("apiBaseUrl", "http://localhost:8000")
    .trim();
  return raw.replace(/\/$/, "");
}


export async function fetchApplications(): Promise<ApplicationFromApi[]> {
  const url = `${getApiBaseUrl()}/api/v0/applications`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Applications request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ApplicationFromApi[]>;
}

export async function updateApplication(
  id: string,
  payload: ApplicationPatchPayload,
): Promise<ApplicationFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/applications/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Update application request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ApplicationFromApi>;
}

export async function fetchMatchingConnectorInstances(
  applicationId: string,
  options?: { onlineOnly?: boolean },
): Promise<ConnectorInstanceFromApi[]> {
  const onlineOnly = options?.onlineOnly ?? true;
  const qs = onlineOnly === false ? "?online_only=false" : "";
  const url = `${getApiBaseUrl()}/api/v0/applications/${applicationId}/matching-connector-instances${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Matching connectors request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ConnectorInstanceFromApi[]>;
}

export type FetchLogBufferParams = {
  targetType: string;
  targetId: string;
  limit?: number;
  order: "asc" | "desc";
  fromTs?: string;
};

export async function fetchLogBufferEvents(
  params: FetchLogBufferParams,
): Promise<LogBufferEvent[]> {
  const search = new URLSearchParams();
  search.set("target_type", params.targetType);
  search.set("target_id", params.targetId);
  search.set("limit", String(params.limit ?? 50));
  search.set("order", params.order);
  if (params.fromTs !== undefined && params.fromTs !== "") {
    search.set("from_ts", params.fromTs);
  }
  const url = `${getApiBaseUrl()}/api/v0/log-buffer?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Log buffer request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Log buffer response is not a JSON array");
  }
  return data as LogBufferEvent[];
}

// ─── Customer client methods ─────────────────────────────────────────────────

export async function fetchCustomers(params?: {
  plan_tier?: CustomerPlanTier;
  is_locked?: boolean;
}): Promise<CustomerFromApi[]> {
  const search = new URLSearchParams();
  if (params?.plan_tier !== undefined) {
    search.set("plan_tier", params.plan_tier);
  }
  if (params?.is_locked !== undefined) {
    search.set("is_locked", String(params.is_locked));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/customers${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Customers request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<CustomerFromApi[]>;
}

export async function fetchCustomer(id: string): Promise<CustomerFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/customers/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Customer request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<CustomerFromApi>;
}

export async function createCustomer(
  payload: CustomerCreatePayload,
): Promise<CustomerFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/customers`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Create customer request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<CustomerFromApi>;
}

export async function updateCustomer(
  id: string,
  payload: CustomerPatchPayload,
): Promise<CustomerFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/customers/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Update customer request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<CustomerFromApi>;
}

export async function fetchCustomerAttributes(
  id: string,
): Promise<CustomerAttributeFromApi[]> {
  const url = `${getApiBaseUrl()}/api/v0/customers/${id}/attributes`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Customer attributes request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<CustomerAttributeFromApi[]>;
}

export async function addCustomerAttribute(
  id: string,
  payload: CustomerAttributeCreatePayload,
): Promise<CustomerAttributeFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/customers/${id}/attributes`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Add customer attribute request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<CustomerAttributeFromApi>;
}

export async function removeCustomerAttribute(
  id: string,
  key: string,
): Promise<void> {
  const url = `${getApiBaseUrl()}/api/v0/customers/${id}/attributes/${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Remove customer attribute request failed (${res.status}): ${text || res.statusText}`,
    );
  }
}

// ─── Subject client methods ──────────────────────────────────────────────────

export async function fetchSubjects(params?: {
  kind?: SubjectKind;
  status?: SubjectStatus;
}): Promise<SubjectFromApi[]> {
  const search = new URLSearchParams();
  if (params?.kind !== undefined) {
    search.set("kind", params.kind);
  }
  if (params?.status !== undefined) {
    search.set("status", params.status);
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/subjects${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Subjects request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<SubjectFromApi[]>;
}

export async function fetchSubject(id: string): Promise<SubjectFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/subjects/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Subject request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<SubjectFromApi>;
}

export async function createSubject(
  payload: SubjectCreatePayload,
): Promise<SubjectFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/subjects`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Create subject request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<SubjectFromApi>;
}

export async function updateSubject(
  id: string,
  payload: SubjectPatchPayload,
): Promise<SubjectFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/subjects/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Update subject request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<SubjectFromApi>;
}

export async function fetchSubjectAttributes(
  id: string,
): Promise<SubjectAttributeFromApi[]> {
  const url = `${getApiBaseUrl()}/api/v0/subjects/${id}/attributes`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Subject attributes request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<SubjectAttributeFromApi[]>;
}

export async function addSubjectAttribute(
  id: string,
  payload: SubjectAttributeCreatePayload,
): Promise<SubjectAttributeFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/subjects/${id}/attributes`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Add subject attribute request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<SubjectAttributeFromApi>;
}

export async function removeSubjectAttribute(
  id: string,
  key: string,
): Promise<void> {
  const url = `${getApiBaseUrl()}/api/v0/subjects/${id}/attributes/${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Remove subject attribute request failed (${res.status}): ${text || res.statusText}`,
    );
  }
}

// ─── Account client methods ──────────────────────────────────────────────────

export async function fetchAccounts(params?: {
  application_id?: string;
  status?: AccountStatus;
  subject_id?: string;
}): Promise<AccountFromApi[]> {
  const search = new URLSearchParams();
  if (params?.application_id !== undefined) {
    search.set("application_id", params.application_id);
  }
  if (params?.status !== undefined) {
    search.set("status", params.status);
  }
  if (params?.subject_id !== undefined) {
    search.set("subject_id", params.subject_id);
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/accounts${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Accounts request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccountFromApi[]>;
}

export async function fetchAccount(id: string): Promise<AccountFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/accounts/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Account request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccountFromApi>;
}

export async function updateAccount(
  id: string,
  payload: AccountPatchPayload,
): Promise<AccountFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/accounts/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Update account request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccountFromApi>;
}

// ─── Resource client methods ─────────────────────────────────────────────────

export async function fetchResources(params?: {
  application_id?: string;
  kind?: string;
  privilege_level?: ResourcePrivilegeLevel;
  environment?: ResourceEnvironment;
  data_sensitivity?: ResourceDataSensitivity;
}): Promise<ResourceFromApi[]> {
  const search = new URLSearchParams();
  if (params?.application_id !== undefined) {
    search.set("application_id", params.application_id);
  }
  if (params?.kind !== undefined) {
    search.set("kind", params.kind);
  }
  if (params?.privilege_level !== undefined) {
    search.set("privilege_level", params.privilege_level);
  }
  if (params?.environment !== undefined) {
    search.set("environment", params.environment);
  }
  if (params?.data_sensitivity !== undefined) {
    search.set("data_sensitivity", params.data_sensitivity);
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/resources${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Resources request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ResourceFromApi[]>;
}

export async function fetchResource(id: string): Promise<ResourceFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/resources/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Resource request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ResourceFromApi>;
}

export async function createResource(
  payload: ResourceCreatePayload,
): Promise<ResourceFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/resources`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Create resource request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ResourceFromApi>;
}

export async function updateResource(
  id: string,
  payload: ResourcePatchPayload,
): Promise<ResourceFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/resources/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Update resource request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ResourceFromApi>;
}

export async function fetchResourceAttributes(
  id: string,
): Promise<ResourceAttributeFromApi[]> {
  const url = `${getApiBaseUrl()}/api/v0/resources/${id}/attributes`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Resource attributes request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ResourceAttributeFromApi[]>;
}

export async function addResourceAttribute(
  id: string,
  payload: ResourceAttributeCreatePayload,
): Promise<ResourceAttributeFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/resources/${id}/attributes`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Add resource attribute request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ResourceAttributeFromApi>;
}

export async function removeResourceAttribute(
  id: string,
  key: string,
): Promise<void> {
  const url = `${getApiBaseUrl()}/api/v0/resources/${id}/attributes/${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Remove resource attribute request failed (${res.status}): ${text || res.statusText}`,
    );
  }
}

// ─── AccessArtifact client methods ───────────────────────────────────────────

export async function fetchAccessArtifacts(params?: {
  application_id?: string;
  source_kind?: string;
  limit?: number;
  offset?: number;
}): Promise<AccessArtifactFromApi[]> {
  const search = new URLSearchParams();
  if (params?.application_id !== undefined) {
    search.set("application_id", params.application_id);
  }
  if (params?.source_kind !== undefined) {
    search.set("source_kind", params.source_kind);
  }
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/access-artifacts${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Access artifacts request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccessArtifactFromApi[]>;
}

export async function fetchAccessArtifact(
  id: string,
): Promise<AccessArtifactFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/access-artifacts/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Access artifact request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccessArtifactFromApi>;
}

// ─── AccessFact client methods ────────────────────────────────────────────────

export async function fetchAccessFacts(params?: {
  subject_id?: string;
  resource_id?: string;
  account_id?: string;
  action?: string;
  effect?: string;
  valid_at?: string;
  limit?: number;
  offset?: number;
}): Promise<AccessFactFromApi[]> {
  const search = new URLSearchParams();
  if (params?.subject_id !== undefined) {
    search.set("subject_id", params.subject_id);
  }
  if (params?.resource_id !== undefined) {
    search.set("resource_id", params.resource_id);
  }
  if (params?.account_id !== undefined) {
    search.set("account_id", params.account_id);
  }
  if (params?.action !== undefined) {
    search.set("action", params.action);
  }
  if (params?.effect !== undefined) {
    search.set("effect", params.effect);
  }
  if (params?.valid_at !== undefined) {
    search.set("valid_at", params.valid_at);
  }
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/access-facts${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Access facts request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccessFactFromApi[]>;
}

export async function fetchAccessFact(id: string): Promise<AccessFactFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/access-facts/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Access fact request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccessFactFromApi>;
}

// ─── ArtifactBinding client methods ──────────────────────────────────────────

export async function fetchArtifactBindings(params?: {
  artifact_id?: string;
  access_fact_id?: string;
  resource_id?: string;
  account_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ArtifactBindingFromApi[]> {
  const search = new URLSearchParams();
  if (params?.artifact_id !== undefined) {
    search.set("artifact_id", params.artifact_id);
  }
  if (params?.access_fact_id !== undefined) {
    search.set("access_fact_id", params.access_fact_id);
  }
  if (params?.resource_id !== undefined) {
    search.set("resource_id", params.resource_id);
  }
  if (params?.account_id !== undefined) {
    search.set("account_id", params.account_id);
  }
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/artifact-bindings${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Artifact bindings request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ArtifactBindingFromApi[]>;
}

export async function fetchArtifactBinding(
  id: string,
): Promise<ArtifactBindingFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/artifact-bindings/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Artifact binding request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ArtifactBindingFromApi>;
}

// ─── Initiative client methods ────────────────────────────────────────────────

export async function fetchInitiatives(params?: {
  access_fact_id?: string;
  type?: InitiativeType;
  limit?: number;
  offset?: number;
}): Promise<InitiativeFromApi[]> {
  const search = new URLSearchParams();
  if (params?.access_fact_id !== undefined) {
    search.set("access_fact_id", params.access_fact_id);
  }
  if (params?.type !== undefined) {
    search.set("type", params.type);
  }
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/initiatives${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Initiatives request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<InitiativeFromApi[]>;
}

export async function fetchInitiative(id: string): Promise<InitiativeFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/initiatives/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Initiative request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<InitiativeFromApi>;
}

export async function createInitiative(
  payload: InitiativeCreatePayload,
): Promise<InitiativeFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/initiatives`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Create initiative request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<InitiativeFromApi>;
}

export async function updateInitiative(
  id: string,
  payload: InitiativePatchPayload,
): Promise<InitiativeFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/initiatives/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Update initiative request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<InitiativeFromApi>;
}

// ─── Ownership Assignment client methods ─────────────────────────────────────

export async function fetchOwnershipAssignments(params?: {
  subject_id?: string;
  resource_id?: string;
  account_id?: string;
  kind?: OwnershipKind;
  limit?: number;
  offset?: number;
}): Promise<OwnershipAssignmentFromApi[]> {
  const search = new URLSearchParams();
  if (params?.subject_id !== undefined) {
    search.set("subject_id", params.subject_id);
  }
  if (params?.resource_id !== undefined) {
    search.set("resource_id", params.resource_id);
  }
  if (params?.account_id !== undefined) {
    search.set("account_id", params.account_id);
  }
  if (params?.kind !== undefined) {
    search.set("kind", params.kind);
  }
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/ownership-assignments${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Ownership assignments request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<OwnershipAssignmentFromApi[]>;
}

export async function fetchOwnershipAssignment(
  id: string,
): Promise<OwnershipAssignmentFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/ownership-assignments/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Ownership assignment request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<OwnershipAssignmentFromApi>;
}

export async function createOwnershipAssignment(
  payload: OwnershipAssignmentCreatePayload,
): Promise<OwnershipAssignmentFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/ownership-assignments`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Create ownership assignment request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<OwnershipAssignmentFromApi>;
}

export async function deleteOwnershipAssignment(id: string): Promise<void> {
  const url = `${getApiBaseUrl()}/api/v0/ownership-assignments/${id}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Delete ownership assignment request failed (${res.status}): ${text || res.statusText}`,
    );
  }
}

// ─── AccessUsageFact client methods ──────────────────────────────────────────

export async function fetchAccessUsageFacts(params?: {
  subject_id?: string;
  resource_id?: string;
  access_fact_id?: string;
  since?: string;
  limit?: number;
  offset?: number;
}): Promise<AccessUsageFactFromApi[]> {
  const search = new URLSearchParams();
  if (params?.subject_id !== undefined) {
    search.set("subject_id", params.subject_id);
  }
  if (params?.resource_id !== undefined) {
    search.set("resource_id", params.resource_id);
  }
  if (params?.access_fact_id !== undefined) {
    search.set("access_fact_id", params.access_fact_id);
  }
  if (params?.since !== undefined) {
    search.set("since", params.since);
  }
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/access-usage-facts${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Access usage facts request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccessUsageFactFromApi[]>;
}

export async function fetchAccessUsageFact(
  id: string,
): Promise<AccessUsageFactFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/access-usage-facts/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Access usage fact request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccessUsageFactFromApi>;
}

export async function createAccessUsageFact(
  payload: AccessUsageFactCreatePayload,
): Promise<AccessUsageFactFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/access-usage-facts`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Create access usage fact request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<AccessUsageFactFromApi>;
}

// ─── ThreatFact client methods ────────────────────────────────────────────────

export async function fetchThreatFacts(params?: {
  subject_id?: string;
  account_id?: string;
  min_risk_score?: number;
  limit?: number;
  offset?: number;
}): Promise<ThreatFactFromApi[]> {
  const search = new URLSearchParams();
  if (params?.subject_id !== undefined) {
    search.set("subject_id", params.subject_id);
  }
  if (params?.account_id !== undefined) {
    search.set("account_id", params.account_id);
  }
  if (params?.min_risk_score !== undefined) {
    search.set("min_risk_score", String(params.min_risk_score));
  }
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/threat-facts${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Threat facts request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ThreatFactFromApi[]>;
}

export async function fetchThreatFact(id: string): Promise<ThreatFactFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/threat-facts/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Threat fact request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ThreatFactFromApi>;
}

export async function upsertThreatFact(
  subjectId: string,
  payload: ThreatFactUpsertPayload,
): Promise<ThreatFactFromApi> {
  const url = `${getApiBaseUrl()}/api/v0/threat-facts/${subjectId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Upsert threat fact request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<ThreatFactFromApi>;
}

// ─── Platform observability (Events & Logs panel) ────────────────────────────

export async function fetchPlatformEvents(
  limit?: number,
): Promise<PlatformEventEntry[]> {
  const search = new URLSearchParams();
  search.set("limit", String(limit ?? 50));
  const url = `${getApiBaseUrl()}/api/v0/platform/events?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Platform events request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Platform events response is not a JSON array");
  }
  return data as PlatformEventEntry[];
}

// ─── Person client methods ────────────────────────────────────────────────────

export async function fetchPersons(params?: {
  limit?: number;
}): Promise<PersonFromApi[]> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/persons${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Persons request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Persons response is not a JSON array");
  }
  return data as PersonFromApi[];
}

// ─── Employee client methods ──────────────────────────────────────────────────

export async function fetchEmployees(params?: {
  limit?: number;
}): Promise<EmployeeFromApi[]> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/employees${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Employees request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Employees response is not a JSON array");
  }
  return data as EmployeeFromApi[];
}

// ─── NHI client methods ───────────────────────────────────────────────────────

export async function fetchNHIs(params?: {
  limit?: number;
}): Promise<NHIFromApi[]> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/nhi${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `NHIs request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("NHIs response is not a JSON array");
  }
  return data as NHIFromApi[];
}

// ─── EmployeeRecord client methods ────────────────────────────────────────────

export async function fetchEmployeeRecords(params?: {
  limit?: number;
}): Promise<EmployeeRecordFromApi[]> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  const qs = search.toString() ? `?${search.toString()}` : "";
  const url = `${getApiBaseUrl()}/api/v0/employee-records${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Employee records request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Employee records response is not a JSON array");
  }
  return data as EmployeeRecordFromApi[];
}

export async function fetchPlatformLogs(params: {
  limit?: number;
  level?: string;
}): Promise<PlatformLogEntry[]> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 50));
  if (params.level !== undefined && params.level !== "") {
    search.set("level", params.level);
  }
  const url = `${getApiBaseUrl()}/api/v0/platform/logs?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Platform logs request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Platform logs response is not a JSON array");
  }
  return data as PlatformLogEntry[];
}
