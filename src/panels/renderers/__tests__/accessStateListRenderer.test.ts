import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAccessStateRows,
  buildAccessStateRichRows,
  accessStateColumns,
  ACCESS_STATE_TABS,
} from "../accessStateListRenderer";

// ─── Sample rows ─────────────────────────────────────────────────────────────

const LIST_ROW = {
  id: "04d6d5bc-1111-2222-3333-444455556666",
  subject_id: "3350a453-aaaa-bbbb-cccc-ddddeeeeffffaa",
  account_id: "7345ca50-1111-2222-3333-444455556666",
  resource_id: "94b4c29d-1111-2222-3333-444455556666",
  action_slug: "write",
  effect: "allow",
  is_active: false,
  valid_until: "2026-01-01T00:00:00Z",
  subject_display: null,
  account_display: "dmitri.volkov",
  resource_display: "ghe/repos/aurelion-kernel (repository)",
  application_code: "GHE",
  application_name: "GitHub Enterprise",
  created_at: "2026-05-12T12:00:00+02:00",
};

const LIST_ROW_WITH_DISPLAY = {
  ...LIST_ROW,
  subject_display: "Dmitri Volkov",
};

const LIST_ROW_NO_APP_NAME = {
  ...LIST_ROW,
  application_name: null,
};

const INCOMING_ROW = {
  id: "1f96499f-aaaa-bbbb-cccc-ddddeeeeffffaa",
  subject_id: "44d2327e-aaaa-bbbb-cccc-ddddeeeeffffaa",
  account_id: null,
  resource_id: "968e0af3-aaaa-bbbb-cccc-ddddeeeeffffaa",
  operation: "create",
  entity_type: "access_fact",
  status: "pending",
  created_at: "2026-05-12T18:27:03.876806Z",
  subject_display: null,
  account_display: null,
  resource_display: "gws/groups/platform-infra (group)",
  application_code: "GWORKSPACE",
  application_name: "Google Workspace",
  change_summary: "+ MEMBER",
  reconciliation_run_id: "run-deadbeef",
};

const INCOMING_ROW_WITH_DISPLAY = {
  ...INCOMING_ROW,
  subject_display: "Pavel Morozov",
};

const INCOMING_ROW_REVOKE = {
  ...INCOMING_ROW,
  operation: "revoke",
};

const INCOMING_ROW_UPDATE = {
  ...INCOMING_ROW,
  operation: "update",
};

const INCOMING_ROW_NOOP = {
  ...INCOMING_ROW,
  operation: "noop",
};

const INCOMING_ROW_REACTIVATE = {
  ...INCOMING_ROW,
  operation: "reactivate",
};

const OUTGOING_ROW = {
  id: "34c4f49a-aaaa-bbbb-cccc-ddddeeeeffffaa",
  plan_id: "ed294830-aaaa-bbbb-cccc-ddddeeeeffffaa",
  kind: "account_disable",
  subject_ref: "8ad09a41-aaaa-bbbb-cccc-ddddeeeeffffaa",
  subject_type: "employee",
  execution_status: "proposed",
  created_at: "2026-05-12T18:27:03.876806Z",
  subject_display: "Pavel Morozov",
  application_code: "GHE",
  application_name: "GitHub Enterprise",
  target_display: "account: pavel.morozov",
  change_summary: "⊘ disable",
};

const OUTGOING_ROW_EXECUTING = { ...OUTGOING_ROW, execution_status: "executing" };
const OUTGOING_ROW_DONE = { ...OUTGOING_ROW, execution_status: "done" };
const OUTGOING_ROW_FAILED = { ...OUTGOING_ROW, execution_status: "failed" };

// ─── accessStateColumns ───────────────────────────────────────────────────────

describe("accessStateColumns", () => {
  it("returns 7 columns for list tab, Application first", () => {
    const cols = accessStateColumns("list");
    assert.equal(cols.length, 7);
    assert.equal(cols[0], "Application");
    assert.equal(cols[1], "Subject");
    assert.equal(cols[5], "Effect");
  });

  it("returns 6 columns for incoming tab, Application first", () => {
    const cols = accessStateColumns("incoming");
    assert.equal(cols.length, 6);
    assert.equal(cols[0], "Application");
    assert.equal(cols[1], "Op");
    assert.equal(cols[2], "Subject");
    assert.equal(cols[3], "Target");
    assert.equal(cols[4], "Change");
    assert.equal(cols[5], "Time");
  });

  it("returns 7 columns for outgoing tab, Application first", () => {
    const cols = accessStateColumns("outgoing");
    assert.equal(cols.length, 7);
    assert.equal(cols[0], "Application");
    assert.equal(cols[1], "Kind");
    assert.equal(cols[2], "Status");
    assert.equal(cols[3], "Subject");
  });
});

// ─── List: Application cell ───────────────────────────────────────────────────

describe("buildAccessStateRichRows - list Application cell", () => {
  it("Application is at position 0, shows application_name when present", () => {
    const rows = buildAccessStateRichRows("list", [LIST_ROW]);
    assert.equal(rows[0].cells[0].text, "GitHub Enterprise");
  });

  it("falls back to application_code when application_name is null", () => {
    const rows = buildAccessStateRichRows("list", [LIST_ROW_NO_APP_NAME]);
    assert.equal(rows[0].cells[0].text, "GHE");
  });

  it("shows — when both application_name and application_code are null", () => {
    const row = { ...LIST_ROW, application_name: null, application_code: null };
    const rows = buildAccessStateRichRows("list", [row]);
    assert.equal(rows[0].cells[0].text, "—");
  });
});

// ─── Incoming: Application cell ──────────────────────────────────────────────

describe("buildAccessStateRichRows - incoming Application cell", () => {
  it("Application is at position 0, shows application_name", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW]);
    assert.equal(rows[0].cells[0].text, "Google Workspace");
  });

  it("falls back to application_code when application_name is null", () => {
    const row = { ...INCOMING_ROW, application_name: null };
    const rows = buildAccessStateRichRows("incoming", [row]);
    assert.equal(rows[0].cells[0].text, "GWORKSPACE");
  });
});

// ─── Outgoing: Application cell ──────────────────────────────────────────────

describe("buildAccessStateRichRows - outgoing Application cell", () => {
  it("Application is at position 0, shows application_name", () => {
    const rows = buildAccessStateRichRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows[0].cells[0].text, "GitHub Enterprise");
  });

  it("falls back to application_code when application_name is null", () => {
    const row = { ...OUTGOING_ROW, application_name: null };
    const rows = buildAccessStateRichRows("outgoing", [row]);
    assert.equal(rows[0].cells[0].text, "GHE");
  });
});

// ─── Incoming: Op CSS class ───────────────────────────────────────────────────

describe("buildAccessStateRichRows - incoming op classes", () => {
  it("create operation has op-create class at cell[1]", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW]);
    assert.equal(rows.length, 1);
    const opCell = rows[0].cells[1];
    assert.equal(opCell.cssClass, "op-create");
    assert.ok(opCell.text.includes("create"));
  });

  it("revoke operation has op-revoke class", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW_REVOKE]);
    assert.equal(rows[0].cells[1].cssClass, "op-revoke");
  });

  it("update operation has op-update class", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW_UPDATE]);
    assert.equal(rows[0].cells[1].cssClass, "op-update");
  });

  it("noop operation has op-noop class", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW_NOOP]);
    assert.equal(rows[0].cells[1].cssClass, "op-noop");
  });

  it("reactivate operation has op-reactivate class", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW_REACTIVATE]);
    assert.equal(rows[0].cells[1].cssClass, "op-reactivate");
  });
});

// ─── Incoming: Subject fallback ───────────────────────────────────────────────

describe("buildAccessStateRichRows - incoming subject fallback", () => {
  it("uses subject_display at cell[2] when present", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW_WITH_DISPLAY]);
    const subjectCell = rows[0].cells[2];
    assert.equal(subjectCell.text, "Pavel Morozov");
  });

  it("falls back to short(subject_id) at cell[2] when subject_display is null", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW]);
    const subjectCell = rows[0].cells[2];
    assert.ok(subjectCell.text.length <= 9, `text should be ≤9 chars, got: ${subjectCell.text}`);
    assert.equal(subjectCell.tooltip, "44d2327e-aaaa-bbbb-cccc-ddddeeeeffffaa");
  });

  it("resource_display shown in target cell at cell[3]", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW]);
    const targetCell = rows[0].cells[3];
    assert.equal(targetCell.text, "gws/groups/platform-infra (group)");
  });

  it("change_summary shown at cell[4]", () => {
    const rows = buildAccessStateRichRows("incoming", [INCOMING_ROW]);
    const changeCell = rows[0].cells[4];
    assert.equal(changeCell.text, "+ MEMBER");
  });
});

// ─── Outgoing: execution_status CSS class ────────────────────────────────────

describe("buildAccessStateRichRows - outgoing exec status classes", () => {
  it("proposed has exec-proposed class at cell[2]", () => {
    const rows = buildAccessStateRichRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows[0].cells[2].cssClass, "exec-proposed");
  });

  it("executing has exec-executing class", () => {
    const rows = buildAccessStateRichRows("outgoing", [OUTGOING_ROW_EXECUTING]);
    assert.equal(rows[0].cells[2].cssClass, "exec-executing");
  });

  it("done has exec-done class", () => {
    const rows = buildAccessStateRichRows("outgoing", [OUTGOING_ROW_DONE]);
    assert.equal(rows[0].cells[2].cssClass, "exec-done");
  });

  it("failed has exec-failed class", () => {
    const rows = buildAccessStateRichRows("outgoing", [OUTGOING_ROW_FAILED]);
    assert.equal(rows[0].cells[2].cssClass, "exec-failed");
  });
});

// ─── Outgoing: kind abbreviation ─────────────────────────────────────────────

describe("buildAccessStateRichRows - outgoing kind abbreviation", () => {
  it("account_disable -> ⊘account at cell[1]", () => {
    const rows = buildAccessStateRichRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows[0].cells[1].text, "⊘account");
    assert.equal(rows[0].cells[1].tooltip, "account_disable");
  });

  it("subject_display used at cell[3] when present", () => {
    const rows = buildAccessStateRichRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows[0].cells[3].text, "Pavel Morozov");
  });
});

// ─── List: Effect badge CSS class ────────────────────────────────────────────

describe("buildAccessStateRichRows - list effect badge", () => {
  it("allow effect has badge-effect-allow class at cell[5]", () => {
    const rows = buildAccessStateRichRows("list", [LIST_ROW]);
    const effectCell = rows[0].cells[5];
    assert.equal(effectCell.cssClass, "badge-effect-allow");
    assert.equal(effectCell.text, "allow");
  });

  it("deny effect has badge-effect-deny class", () => {
    const denyRow = { ...LIST_ROW, effect: "deny" };
    const rows = buildAccessStateRichRows("list", [denyRow]);
    assert.equal(rows[0].cells[5].cssClass, "badge-effect-deny");
  });
});

// ─── List: subject_display vs fallback ───────────────────────────────────────

describe("buildAccessStateRichRows - list subject fallback", () => {
  it("uses subject_display at cell[1] when present", () => {
    const rows = buildAccessStateRichRows("list", [LIST_ROW_WITH_DISPLAY]);
    assert.equal(rows[0].cells[1].text, "Dmitri Volkov");
    assert.equal(rows[0].cells[1].tooltip, undefined);
  });

  it("falls back to short(subject_id) at cell[1] with tooltip=full UUID", () => {
    const rows = buildAccessStateRichRows("list", [LIST_ROW]);
    const subjectCell = rows[0].cells[1];
    assert.ok(subjectCell.text.length <= 9);
    assert.equal(subjectCell.tooltip, "3350a453-aaaa-bbbb-cccc-ddddeeeeffffaa");
  });
});

// ─── Time formatting ─────────────────────────────────────────────────────────

describe("buildAccessStateRichRows - time formatting", () => {
  it("same-day ISO renders as HH:mm:ss", () => {
    const now = new Date();
    const iso = now.toISOString();
    const row = { ...INCOMING_ROW, created_at: iso };
    const rows = buildAccessStateRichRows("incoming", [row]);
    const timeText = rows[0].cells[5].text;
    // HH:mm:ss = 8 chars
    assert.match(timeText, /^\d{2}:\d{2}:\d{2}$/);
  });

  it("older date renders as MM-DD HH:mm", () => {
    const row = { ...INCOMING_ROW, created_at: "2024-01-15T10:30:00Z" };
    const rows = buildAccessStateRichRows("incoming", [row]);
    const timeText = rows[0].cells[5].text;
    assert.match(timeText, /^\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

// ─── buildAccessStateRows (PanelRow output) ───────────────────────────────────

describe("buildAccessStateRows - PanelRow output", () => {
  it("produces correct cell count for incoming (6)", () => {
    const rows = buildAccessStateRows("incoming", [INCOMING_ROW]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 6);
  });

  it("produces correct cell count for outgoing (7)", () => {
    const rows = buildAccessStateRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 7);
  });

  it("produces correct cell count for list (7)", () => {
    const rows = buildAccessStateRows("list", [LIST_ROW]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 7);
  });

  it("returns empty for empty data", () => {
    assert.equal(buildAccessStateRows("list", []).length, 0);
  });

  it("encodes cssClass+tooltip in extra field when present (incoming op cell now at index 1)", () => {
    const rows = buildAccessStateRows("incoming", [INCOMING_ROW]);
    const opCell = rows[0].cells[1];
    assert.ok(opCell.extra !== undefined);
    const parsed = JSON.parse(opCell.extra as string);
    assert.equal(parsed.cssClass, "op-create");
  });
});

// ─── ACCESS_STATE_TABS ────────────────────────────────────────────────────────

describe("ACCESS_STATE_TABS", () => {
  it("has exactly 3 tabs with correct keys", () => {
    assert.equal(ACCESS_STATE_TABS.length, 3);
    const keys = ACCESS_STATE_TABS.map((t) => t.key);
    assert.deepEqual(keys, ["list", "incoming", "outgoing"]);
  });

  it("has correct labels", () => {
    const labels = ACCESS_STATE_TABS.map((t) => t.label);
    assert.deepEqual(labels, ["List", "Incoming", "Outgoing"]);
  });
});
