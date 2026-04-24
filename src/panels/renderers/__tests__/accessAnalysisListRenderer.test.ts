import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAccessAnalysisRows,
  accessAnalysisColumns,
} from "../accessAnalysisListRenderer";

describe("accessAnalysisColumns", () => {
  it("returns canonical 4 headers in correct order", () => {
    const cols = accessAnalysisColumns();
    assert.deepEqual(cols, ["ID", "Name", "Description", "Updated"]);
  });
});

describe("buildAccessAnalysisRows", () => {
  it("maps a finding row to 4-cell PanelRow", () => {
    const finding = {
      id: 101,
      scan_run_id: 5,
      rule_id: 3,
      severity: "critical",
      status: "open",
      detected_at: "2026-04-01T00:00:00Z",
    };
    const rows = buildAccessAnalysisRows("findings", [finding]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 4);
    // id cell
    assert.equal(rows[0].cells[0].kind, "text");
    // name should be rule_id
    assert.equal(rows[0].cells[1].value, "3");
    // desc should be severity / status
    assert.ok(rows[0].cells[2].value.includes("critical"), "desc must include severity");
    assert.ok(rows[0].cells[2].value.includes("open"), "desc must include status");
    // ts cell
    assert.equal(rows[0].cells[3].kind, "ts");
    assert.ok(rows[0].cells[3].value.includes("2026"));
  });

  it("maps a mitigation row to 4-cell PanelRow", () => {
    const mitigation = {
      id: 55,
      rule_id: 7,
      control_id: 2,
      subject_id: "subj-abc",
      status: "approved",
      created_at: "2026-03-10T12:00:00Z",
    };
    const rows = buildAccessAnalysisRows("mitigations", [mitigation]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 4);
    assert.equal(rows[0].cells[1].value, "7", "name should be rule_id");
    assert.equal(rows[0].cells[2].value, "approved", "desc should be status");
  });

  it("maps a capability row to 4-cell PanelRow", () => {
    const capability = {
      id: 1,
      slug: "approve_payment",
      name: "Approve Payment",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    };
    const rows = buildAccessAnalysisRows("capabilities", [capability]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells[1].value, "approve_payment", "name should be slug");
    assert.equal(rows[0].cells[2].value, "Approve Payment", "desc should be name");
  });

  it("falls back gracefully for unknown category key without throwing", () => {
    const item = {
      id: "x-999",
      slug: "something",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
    };
    let rows;
    assert.doesNotThrow(() => {
      rows = buildAccessAnalysisRows("unknownCategory", [item]);
    });
    assert.ok(Array.isArray(rows));
    assert.equal((rows as unknown[]).length, 1);
  });

  it("handles empty data array", () => {
    const rows = buildAccessAnalysisRows("findings", []);
    assert.equal(rows.length, 0);
  });

  it("each row id falls back to index string when id field is missing", () => {
    const rows = buildAccessAnalysisRows("findings", [{}]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "0");
  });
});
