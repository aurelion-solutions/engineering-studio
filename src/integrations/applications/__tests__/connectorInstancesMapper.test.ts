import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectorInstancesToNodes } from "../connectorInstancesMapper";
import type { ConnectorInstanceFromApi } from "../../../api/types";

function makeInstance(overrides: Partial<ConnectorInstanceFromApi> = {}): ConnectorInstanceFromApi {
  return {
    id: "row-uuid-1",
    instance_id: "connector-abc",
    tags: ["tag-a", "tag-b"],
    is_online: true,
    last_seen_at: "2024-06-01T12:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-01T12:00:00Z",
    ...overrides,
  };
}

describe("connectorInstancesToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(connectorInstancesToNodes("app-1", []), []);
  });

  it("maps a single online instance to a node with composite id, label, isOnline, lastSeenAt, tags", () => {
    const instance = makeInstance({
      id: "row-uuid-1",
      instance_id: "my-connector",
      is_online: true,
      last_seen_at: "2024-06-01T12:00:00Z",
      tags: ["prod", "eu-west"],
    });
    const nodes = connectorInstancesToNodes("app-x", [instance]);
    assert.strictEqual(nodes.length, 1);
    const node = nodes[0];
    assert.strictEqual(node.id, "app-x/row-uuid-1");
    assert.strictEqual(node.label, "my-connector");
    assert.strictEqual(node.instanceId, "my-connector");
    assert.strictEqual(node.instanceRowId, "row-uuid-1");
    assert.strictEqual(node.isOnline, true);
    assert.strictEqual(node.lastSeenAt, "2024-06-01T12:00:00Z");
    assert.deepStrictEqual(node.tags, ["prod", "eu-west"]);
  });

  it("preserves order when mapping multiple instances", () => {
    const instances = [
      makeInstance({ id: "row-1", instance_id: "alpha" }),
      makeInstance({ id: "row-2", instance_id: "beta" }),
      makeInstance({ id: "row-3", instance_id: "gamma" }),
    ];
    const nodes = connectorInstancesToNodes("app-y", instances);
    assert.strictEqual(nodes.length, 3);
    assert.strictEqual(nodes[0].instanceId, "alpha");
    assert.strictEqual(nodes[1].instanceId, "beta");
    assert.strictEqual(nodes[2].instanceId, "gamma");
  });

  it("handles empty tags array without error", () => {
    const instance = makeInstance({ tags: [] });
    const nodes = connectorInstancesToNodes("app-z", [instance]);
    assert.deepStrictEqual(nodes[0].tags, []);
  });

  it("handles unicode in instance_id without transformation", () => {
    const instance = makeInstance({ instance_id: "коннектор-🔌" });
    const nodes = connectorInstancesToNodes("app-u", [instance]);
    assert.strictEqual(nodes[0].instanceId, "коннектор-🔌");
    assert.strictEqual(nodes[0].label, "коннектор-🔌");
  });

  it("generates unique composite ids for different appIds with same instance id", () => {
    const instance = makeInstance({ id: "same-row" });
    const nodesA = connectorInstancesToNodes("app-a", [instance]);
    const nodesB = connectorInstancesToNodes("app-b", [instance]);
    assert.strictEqual(nodesA[0].id, "app-a/same-row");
    assert.strictEqual(nodesB[0].id, "app-b/same-row");
    assert.notStrictEqual(nodesA[0].id, nodesB[0].id);
  });
});
