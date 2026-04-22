import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildApplicationRows, buildConnectorSection, applicationColumns, applicationTitle } from "../applicationRenderer";
import type { ApplicationFromApi, ConnectorInstanceFromApi } from "../../../api/types";

const fakeApp: ApplicationFromApi = {
  id: "app-1",
  name: "Billing",
  code: "billing",
  config: {},
  required_connector_tags: ["prod"],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

const fakeConnector: ConnectorInstanceFromApi = {
  id: "ci-1",
  instance_id: "inst-abc",
  tags: ["prod"],
  is_online: true,
  last_seen_at: "2024-06-01T12:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

describe("buildApplicationRows", () => {
  it("returns kv rows for app fields only (connectors are a separate section)", () => {
    const rows = buildApplicationRows({ app: fakeApp, connectors: [fakeConnector] });
    const kvIds = rows.filter((r) => r.id.startsWith("kv-")).map((r) => r.id);
    assert.ok(kvIds.length > 0, "Should have kv rows");
    assert.ok(kvIds[0] === "kv-name", "First kv row should be name");
    const connRow = rows.find((r) => r.id.startsWith("connector-"));
    assert.ok(connRow === undefined, "Connector rows should not be in main rows");
  });
});

describe("buildConnectorSection", () => {
  it("returns connector rows when connectors are present", () => {
    const section = buildConnectorSection([fakeConnector]);
    const connRow = section.rows.find((r) => r.id === "connector-ci-1");
    assert.ok(connRow !== undefined, "Should have a connector row");
  });

  it("includes no-connectors placeholder when connectors list is empty", () => {
    const section = buildConnectorSection([]);
    const noConn = section.rows.find((r) => r.id === "no-connectors");
    assert.ok(noConn !== undefined, "Should have no-connectors placeholder row");
  });
});

describe("applicationColumns", () => {
  it("returns 2 column headers", () => {
    assert.equal(applicationColumns().length, 2);
  });
});

describe("applicationTitle", () => {
  it("uses appName from context", () => {
    const title = applicationTitle({
      kind: "application",
      ctxKey: "app-1",
      appId: "app-1",
      appName: "Billing",
    });
    assert.ok(title.includes("Billing"), "Title should include app name");
  });
});
