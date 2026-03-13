import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applicationsToNodes } from "../applicationsMapper";
import type { ApplicationFromApi } from "../../../api/types";

function makeApp(overrides: Partial<ApplicationFromApi> = {}): ApplicationFromApi {
  return {
    id: "app-1",
    name: "Test App",
    code: "test-app",
    config: {},
    required_connector_tags: [],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("applicationsToNodes", () => {
  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(applicationsToNodes([]), []);
  });

  it("maps a single app to a node with correct id and label", () => {
    const app = makeApp({ id: "abc-123", name: "My Application" });
    const nodes = applicationsToNodes([app]);
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(nodes[0].id, "abc-123");
    assert.strictEqual(nodes[0].label, "My Application");
  });

  it("preserves order for multiple apps", () => {
    const apps = [
      makeApp({ id: "first", name: "Alpha" }),
      makeApp({ id: "second", name: "Beta" }),
      makeApp({ id: "third", name: "Gamma" }),
    ];
    const nodes = applicationsToNodes(apps);
    assert.strictEqual(nodes.length, 3);
    assert.strictEqual(nodes[0].id, "first");
    assert.strictEqual(nodes[1].id, "second");
    assert.strictEqual(nodes[2].id, "third");
  });

  it("passes unicode name through as-is without validation", () => {
    const app = makeApp({ id: "unicode-app", name: "Приложение 🔑" });
    const nodes = applicationsToNodes([app]);
    assert.strictEqual(nodes[0].label, "Приложение 🔑");
  });

  it("passes empty string name through as-is without validation", () => {
    const app = makeApp({ id: "empty-name", name: "" });
    const nodes = applicationsToNodes([app]);
    assert.strictEqual(nodes[0].label, "");
  });
});
