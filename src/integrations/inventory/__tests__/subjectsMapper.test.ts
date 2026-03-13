import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapSubjectsToNodes } from "../subjectsMapper";
import type { SubjectFromApi } from "../../../api/types";

function makeEmployeeSubject(overrides: Partial<SubjectFromApi> = {}): SubjectFromApi {
  return {
    id: "subj-uuid-emp-1",
    external_id: "emp-ext-001",
    kind: "employee",
    nhi_kind: null,
    principal_employee_id: "emp-uuid-1",
    principal_nhi_id: null,
    principal_customer_id: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function makeNhiSubject(overrides: Partial<SubjectFromApi> = {}): SubjectFromApi {
  return {
    id: "subj-uuid-nhi-1",
    external_id: "nhi-ext-001",
    kind: "nhi",
    nhi_kind: "service_account",
    principal_employee_id: null,
    principal_nhi_id: "nhi-uuid-1",
    principal_customer_id: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-03T00:00:00Z",
    ...overrides,
  };
}

function makeCustomerSubject(overrides: Partial<SubjectFromApi> = {}): SubjectFromApi {
  return {
    id: "subj-uuid-cust-1",
    external_id: "cust-ext-001",
    kind: "customer",
    nhi_kind: null,
    principal_employee_id: null,
    principal_nhi_id: null,
    principal_customer_id: "cust-uuid-1",
    status: "registered",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-04T00:00:00Z",
    ...overrides,
  };
}

describe("mapSubjectsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(mapSubjectsToNodes([]), []);
  });

  // ─── Employee subject ───────────────────────────────────────────────────────

  it("[employee] sets label to external_id", () => {
    const nodes = mapSubjectsToNodes([makeEmployeeSubject({ external_id: "my-subject" })]);
    assert.strictEqual(nodes[0].label, "my-subject");
  });

  it("[employee] description contains kind and status", () => {
    const nodes = mapSubjectsToNodes([makeEmployeeSubject({ kind: "employee", status: "hired" })]);
    assert.ok(nodes[0].description.includes("employee"));
    assert.ok(nodes[0].description.includes("hired"));
  });

  it("[employee] tooltip contains subject_id", () => {
    const nodes = mapSubjectsToNodes([makeEmployeeSubject({ id: "subj-uuid-emp-1" })]);
    const tooltip = nodes[0].tooltipLines.join("\n");
    assert.ok(tooltip.includes("subj-uuid-emp-1"));
  });

  it("[employee] tooltip contains updated_at", () => {
    const nodes = mapSubjectsToNodes([makeEmployeeSubject({ updated_at: "2026-01-02T00:00:00Z" })]);
    const tooltip = nodes[0].tooltipLines.join("\n");
    assert.ok(tooltip.includes("2026-01-02T00:00:00Z"));
  });

  it("[employee] contextValue is aurelion.subjectItem", () => {
    const nodes = mapSubjectsToNodes([makeEmployeeSubject()]);
    assert.strictEqual(nodes[0].contextValue, "aurelion.subjectItem");
  });

  // ─── NHI subject ────────────────────────────────────────────────────────────

  it("[nhi] description contains kind and status", () => {
    const nodes = mapSubjectsToNodes([makeNhiSubject()]);
    assert.ok(nodes[0].description.includes("nhi"));
    assert.ok(nodes[0].description.includes("active"));
  });

  it("[nhi] tooltip contains nhi_kind", () => {
    const nodes = mapSubjectsToNodes([makeNhiSubject({ nhi_kind: "api_key" })]);
    const tooltip = nodes[0].tooltipLines.join("\n");
    assert.ok(tooltip.includes("api_key"));
  });

  it("[nhi] tooltip contains principal_nhi_id", () => {
    const nodes = mapSubjectsToNodes([makeNhiSubject({ principal_nhi_id: "nhi-uuid-1" })]);
    const tooltip = nodes[0].tooltipLines.join("\n");
    assert.ok(tooltip.includes("nhi-uuid-1"));
  });

  it("[nhi] contextValue is aurelion.subjectItem", () => {
    const nodes = mapSubjectsToNodes([makeNhiSubject()]);
    assert.strictEqual(nodes[0].contextValue, "aurelion.subjectItem");
  });

  // ─── Customer subject ────────────────────────────────────────────────────────

  it("[customer] description contains kind and status", () => {
    const nodes = mapSubjectsToNodes([makeCustomerSubject()]);
    assert.ok(nodes[0].description.includes("customer"));
    assert.ok(nodes[0].description.includes("registered"));
  });

  it("[customer] tooltip contains principal_customer_id", () => {
    const nodes = mapSubjectsToNodes([makeCustomerSubject({ principal_customer_id: "cust-uuid-1" })]);
    const tooltip = nodes[0].tooltipLines.join("\n");
    assert.ok(tooltip.includes("cust-uuid-1"));
  });

  it("[customer] contextValue is aurelion.subjectItem", () => {
    const nodes = mapSubjectsToNodes([makeCustomerSubject()]);
    assert.strictEqual(nodes[0].contextValue, "aurelion.subjectItem");
  });

  // ─── Multi-subject ordering ──────────────────────────────────────────────────

  it("preserves order across multiple subjects", () => {
    const subjects = [
      makeEmployeeSubject({ id: "a", external_id: "first" }),
      makeNhiSubject({ id: "b", external_id: "second" }),
      makeCustomerSubject({ id: "c", external_id: "third" }),
    ];
    const nodes = mapSubjectsToNodes(subjects);
    assert.strictEqual(nodes[0].label, "first");
    assert.strictEqual(nodes[1].label, "second");
    assert.strictEqual(nodes[2].label, "third");
  });
});
