import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAccountStateRows,
  buildAccountStateRichRows,
  accountStateColumns,
  ACCOUNT_STATE_TABS,
} from "../accountStateListRenderer";

// ─── Sample rows ─────────────────────────────────────────────────────────────

const LIST_ROW = {
  id: "acct-0001-aaaa-bbbb-cccc-ddddeeeeffffaa",
  application_id: "app-ghe-01",
  application_code: "GHE",
  application_name: "GitHub Enterprise",
  username: "ivan.petrov",
  display_name: "Ivan Petrov",
  status: "active",
  mfa_enabled: true,
  is_privileged: false,
  subject_id: "subj-0001-aaaa-bbbb-cccc-ddddeeeeffffaa",
  subject_display: "Ivan Petrov",
  updated_at: "2026-05-12T14:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

const LIST_ROW_NO_DISPLAY = {
  ...LIST_ROW,
  subject_display: null,
  mfa_enabled: false,
  is_privileged: true,
  status: "suspended",
};

const LIST_ROW_INVITED = {
  ...LIST_ROW,
  status: "invited",
  mfa_enabled: null,
  is_privileged: null,
};

const LIST_ROW_NO_APP_NAME = {
  ...LIST_ROW,
  application_name: null,
};

const INCOMING_ROW = {
  id: "delta-0001-aaaa-bbbb-cccc-ddddeeeeffffaa",
  entity_type: "account",
  operation: "create",
  status: "pending",
  account_id: "acct-0001-aaaa-bbbb-cccc-ddddeeeeffffaa",
  account_display: "ivan.petrov",
  application_code: "GHE",
  application_name: "GitHub Enterprise",
  change_summary: "new account",
  created_at: "2026-05-12T18:27:03.876806Z",
};

const INCOMING_ROW_NO_DISPLAY = {
  ...INCOMING_ROW,
  account_display: null,
};

const INCOMING_ROW_REVOKE = { ...INCOMING_ROW, operation: "revoke" };
const INCOMING_ROW_UPDATE = { ...INCOMING_ROW, operation: "update" };
const INCOMING_ROW_NOOP = { ...INCOMING_ROW, operation: "noop" };
const INCOMING_ROW_REACTIVATE = { ...INCOMING_ROW, operation: "reactivate" };

const OUTGOING_ROW = {
  id: "item-0001-aaaa-bbbb-cccc-ddddeeeeffffaa",
  plan_id: "plan-0001-aaaa-bbbb-cccc-ddddeeeeffffaa",
  kind: "account_disable",
  subject_ref: "8ad09a41-aaaa-bbbb-cccc-ddddeeeeffffaa",
  subject_type: "employee",
  execution_status: "proposed",
  subject_display: "Ivan Petrov",
  application_code: "GHE",
  application_name: "GitHub Enterprise",
  target_display: "account: ivan.petrov",
  change_summary: "⊘ disable",
  created_at: "2026-05-12T18:27:03.876806Z",
};

const OUTGOING_ROW_EXECUTING = { ...OUTGOING_ROW, execution_status: "executing" };
const OUTGOING_ROW_DONE = { ...OUTGOING_ROW, execution_status: "done" };
const OUTGOING_ROW_FAILED = { ...OUTGOING_ROW, execution_status: "failed" };

const OUTGOING_ROW_CREATE = { ...OUTGOING_ROW, kind: "account_create", change_summary: "+ create" };
const OUTGOING_ROW_INVITE = { ...OUTGOING_ROW, kind: "account_invite" };
const OUTGOING_ROW_ACTIVATE = { ...OUTGOING_ROW, kind: "account_activate" };
const OUTGOING_ROW_SUSPEND = { ...OUTGOING_ROW, kind: "account_suspend" };

// ─── accountStateColumns ──────────────────────────────────────────────────────

describe("accountStateColumns", () => {
  it("returns 7 columns for list tab, Application first", () => {
    const cols = accountStateColumns("list");
    assert.equal(cols.length, 7);
    assert.equal(cols[0], "Application");
    assert.equal(cols[1], "Username");
    assert.equal(cols[2], "Status");
    assert.equal(cols[3], "MFA");
    assert.equal(cols[4], "Privileged");
    assert.equal(cols[5], "Subject");
    assert.equal(cols[6], "Updated");
  });

  it("returns 5 columns for incoming tab, Application first", () => {
    const cols = accountStateColumns("incoming");
    assert.equal(cols.length, 5);
    assert.equal(cols[0], "Application");
    assert.equal(cols[1], "Op");
    assert.equal(cols[2], "Account/Target");
    assert.equal(cols[3], "Change");
    assert.equal(cols[4], "Time");
  });

  it("returns 7 columns for outgoing tab, Application first", () => {
    const cols = accountStateColumns("outgoing");
    assert.equal(cols.length, 7);
    assert.equal(cols[0], "Application");
    assert.equal(cols[1], "Kind");
    assert.equal(cols[2], "Status");
  });
});

// ─── List tab ─────────────────────────────────────────────────────────────────

describe("buildAccountStateRichRows - list tab", () => {
  it("Application is at cell[0], shows application_name when present", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW]);
    assert.equal(rows[0].cells[0].text, "GitHub Enterprise");
  });

  it("falls back to application_code when application_name is null", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW_NO_APP_NAME]);
    assert.equal(rows[0].cells[0].text, "GHE");
  });

  it("renders username in cell[1]", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells[1].text, "ivan.petrov");
  });

  it("active status has badge-status-active class at cell[2]", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW]);
    assert.equal(rows[0].cells[2].text, "active");
    assert.equal(rows[0].cells[2].cssClass, "badge-status-active");
  });

  it("suspended status has badge-status-suspended class", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW_NO_DISPLAY]);
    assert.equal(rows[0].cells[2].text, "suspended");
    assert.equal(rows[0].cells[2].cssClass, "badge-status-suspended");
  });

  it("invited status has badge-status-invited class", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW_INVITED]);
    assert.equal(rows[0].cells[2].text, "invited");
    assert.equal(rows[0].cells[2].cssClass, "badge-status-invited");
  });

  it("mfa_enabled true shows ● at cell[3]", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW]);
    assert.equal(rows[0].cells[3].text, "●");
  });

  it("mfa_enabled false shows ○ at cell[3]", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW_NO_DISPLAY]);
    assert.equal(rows[0].cells[3].text, "○");
  });

  it("is_privileged false shows ○ at cell[4]", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW]);
    assert.equal(rows[0].cells[4].text, "○");
  });

  it("is_privileged true shows ● at cell[4]", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW_NO_DISPLAY]);
    assert.equal(rows[0].cells[4].text, "●");
  });

  it("uses subject_display for subject cell at cell[5]", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW]);
    assert.equal(rows[0].cells[5].text, "Ivan Petrov");
  });

  it("falls back to short(subject_id) with tooltip when subject_display is null", () => {
    const rows = buildAccountStateRichRows("list", [LIST_ROW_NO_DISPLAY]);
    const subjectCell = rows[0].cells[5];
    assert.ok(subjectCell.text.length <= 9);
    assert.equal(subjectCell.tooltip, "subj-0001-aaaa-bbbb-cccc-ddddeeeeffffaa");
  });
});

// ─── Incoming tab ─────────────────────────────────────────────────────────────

describe("buildAccountStateRichRows - incoming Application first", () => {
  it("Application is at cell[0], shows application_name", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW]);
    assert.equal(rows[0].cells[0].text, "GitHub Enterprise");
  });

  it("falls back to application_code when application_name is null", () => {
    const row = { ...INCOMING_ROW, application_name: null };
    const rows = buildAccountStateRichRows("incoming", [row]);
    assert.equal(rows[0].cells[0].text, "GHE");
  });
});

describe("buildAccountStateRichRows - incoming op classes", () => {
  it("create has op-create class at cell[1]", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW]);
    assert.equal(rows[0].cells[1].cssClass, "op-create");
    assert.ok(rows[0].cells[1].text.includes("create"));
  });

  it("revoke has op-revoke class", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW_REVOKE]);
    assert.equal(rows[0].cells[1].cssClass, "op-revoke");
  });

  it("update has op-update class", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW_UPDATE]);
    assert.equal(rows[0].cells[1].cssClass, "op-update");
  });

  it("noop has op-noop class", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW_NOOP]);
    assert.equal(rows[0].cells[1].cssClass, "op-noop");
  });

  it("reactivate has op-reactivate class", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW_REACTIVATE]);
    assert.equal(rows[0].cells[1].cssClass, "op-reactivate");
  });

  it("uses account_display in cell[2]", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW]);
    assert.equal(rows[0].cells[2].text, "ivan.petrov");
  });

  it("falls back to short(account_id) with tooltip when display is null", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW_NO_DISPLAY]);
    const cell = rows[0].cells[2];
    assert.ok(cell.text.length <= 9);
    assert.equal(cell.tooltip, "acct-0001-aaaa-bbbb-cccc-ddddeeeeffffaa");
  });

  it("renders change_summary in cell[3]", () => {
    const rows = buildAccountStateRichRows("incoming", [INCOMING_ROW]);
    assert.equal(rows[0].cells[3].text, "new account");
  });
});

// ─── Outgoing tab ─────────────────────────────────────────────────────────────

describe("buildAccountStateRichRows - outgoing Application first", () => {
  it("Application is at cell[0], shows application_name", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows[0].cells[0].text, "GitHub Enterprise");
  });

  it("falls back to application_code when application_name is null", () => {
    const row = { ...OUTGOING_ROW, application_name: null };
    const rows = buildAccountStateRichRows("outgoing", [row]);
    assert.equal(rows[0].cells[0].text, "GHE");
  });
});

describe("buildAccountStateRichRows - outgoing exec status classes", () => {
  it("proposed has exec-proposed class at cell[2]", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows[0].cells[2].cssClass, "exec-proposed");
  });

  it("executing has exec-executing class", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW_EXECUTING]);
    assert.equal(rows[0].cells[2].cssClass, "exec-executing");
  });

  it("done has exec-done class", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW_DONE]);
    assert.equal(rows[0].cells[2].cssClass, "exec-done");
  });

  it("failed has exec-failed class", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW_FAILED]);
    assert.equal(rows[0].cells[2].cssClass, "exec-failed");
  });
});

describe("buildAccountStateRichRows - outgoing kind abbreviation", () => {
  it("account_disable -> ⊘account at cell[1]", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows[0].cells[1].text, "⊘account");
    assert.equal(rows[0].cells[1].tooltip, "account_disable");
  });

  it("account_create -> +account", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW_CREATE]);
    assert.equal(rows[0].cells[1].text, "+account");
  });

  it("account_invite -> +invite", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW_INVITE]);
    assert.equal(rows[0].cells[1].text, "+invite");
  });

  it("account_activate -> ↻activate", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW_ACTIVATE]);
    assert.equal(rows[0].cells[1].text, "↻activate");
  });

  it("account_suspend -> ⏸suspend", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW_SUSPEND]);
    assert.equal(rows[0].cells[1].text, "⏸suspend");
  });

  it("uses subject_display for subject cell at cell[3]", () => {
    const rows = buildAccountStateRichRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows[0].cells[3].text, "Ivan Petrov");
  });
});

// ─── buildAccountStateRows (PanelRow output) ──────────────────────────────────

describe("buildAccountStateRows - PanelRow output", () => {
  it("list tab produces 7 cells", () => {
    const rows = buildAccountStateRows("list", [LIST_ROW]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 7);
  });

  it("incoming tab produces 5 cells", () => {
    const rows = buildAccountStateRows("incoming", [INCOMING_ROW]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 5);
  });

  it("outgoing tab produces 7 cells", () => {
    const rows = buildAccountStateRows("outgoing", [OUTGOING_ROW]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 7);
  });

  it("returns empty for empty data", () => {
    assert.equal(buildAccountStateRows("list", []).length, 0);
  });

  it("encodes cssClass in extra field when present (op cell at index 1 in incoming)", () => {
    const rows = buildAccountStateRows("incoming", [INCOMING_ROW]);
    const opCell = rows[0].cells[1];
    assert.ok(opCell.extra !== undefined);
    const parsed = JSON.parse(opCell.extra as string);
    assert.equal(parsed.cssClass, "op-create");
  });
});

// ─── ACCOUNT_STATE_TABS ───────────────────────────────────────────────────────

describe("ACCOUNT_STATE_TABS", () => {
  it("has exactly 3 tabs with correct keys", () => {
    assert.equal(ACCOUNT_STATE_TABS.length, 3);
    const keys = ACCOUNT_STATE_TABS.map((t) => t.key);
    assert.deepEqual(keys, ["list", "incoming", "outgoing"]);
  });

  it("has correct labels", () => {
    const labels = ACCOUNT_STATE_TABS.map((t) => t.label);
    assert.deepEqual(labels, ["List", "Incoming", "Outgoing"]);
  });
});

// ─── Time formatting ─────────────────────────────────────────────────────────

describe("buildAccountStateRichRows - time formatting", () => {
  it("same-day ISO renders as HH:mm:ss for incoming", () => {
    const now = new Date();
    const row = { ...INCOMING_ROW, created_at: now.toISOString() };
    const rows = buildAccountStateRichRows("incoming", [row]);
    const timeText = rows[0].cells[4].text;
    assert.match(timeText, /^\d{2}:\d{2}:\d{2}$/);
  });

  it("older date renders as MM-DD HH:mm", () => {
    const row = { ...INCOMING_ROW, created_at: "2024-01-15T10:30:00Z" };
    const rows = buildAccountStateRichRows("incoming", [row]);
    const timeText = rows[0].cells[4].text;
    assert.match(timeText, /^\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
