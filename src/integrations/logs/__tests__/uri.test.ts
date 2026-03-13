import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  slugifyAppName,
  buildLogUriParts,
  parseAppIdFromQuery,
  LOGS_SCHEME,
} from "../uri";

describe("slugifyAppName", () => {
  it("lowercases ASCII letters", () => {
    assert.strictEqual(slugifyAppName("HelloWorld"), "helloworld");
  });

  it("replaces spaces with dashes", () => {
    assert.strictEqual(slugifyAppName("My App"), "my-app");
  });

  it("collapses consecutive non-alphanumeric to single dash", () => {
    assert.strictEqual(slugifyAppName("My  App!"), "my-app");
  });

  it("strips leading/trailing dashes", () => {
    assert.strictEqual(slugifyAppName("!hello!"), "hello");
  });

  it("handles dots as non-alphanumeric", () => {
    assert.strictEqual(slugifyAppName("my.app"), "my-app");
  });

  it("non-ASCII (emoji) → 'app' fallback", () => {
    assert.strictEqual(slugifyAppName("🔥"), "app");
  });

  it("non-ASCII (cyrillic) → 'app' fallback", () => {
    assert.strictEqual(slugifyAppName("Приложение"), "app");
  });

  it("empty string → 'app'", () => {
    assert.strictEqual(slugifyAppName(""), "app");
  });

  it("whitespace-only → 'app'", () => {
    assert.strictEqual(slugifyAppName("   "), "app");
  });

  it("null → 'app'", () => {
    assert.strictEqual(slugifyAppName(null), "app");
  });

  it("undefined → 'app'", () => {
    assert.strictEqual(slugifyAppName(undefined), "app");
  });

  it("only special chars → 'app'", () => {
    assert.strictEqual(slugifyAppName("***"), "app");
  });

  it("caps slug at 64 characters", () => {
    const long = "a".repeat(100);
    const result = slugifyAppName(long);
    assert.ok(result.length <= 64, `Expected length <= 64, got ${result.length}`);
  });

  it("does not end with dash after cap", () => {
    // Name that produces dashes near the 64-char boundary
    const long = "a".repeat(63) + "!b";
    const result = slugifyAppName(long);
    assert.ok(!result.endsWith("-"), `Should not end with dash: ${result}`);
  });
});

describe("buildLogUriParts", () => {
  it("returns correct scheme", () => {
    const parts = buildLogUriParts({ id: "app-123", name: "My App" });
    assert.strictEqual(parts.scheme, LOGS_SCHEME);
  });

  it("path starts with / and contains slug", () => {
    const parts = buildLogUriParts({ id: "app-123", name: "My App" });
    assert.strictEqual(parts.path, "/my-app");
  });

  it("query contains id param", () => {
    const parts = buildLogUriParts({ id: "app-123", name: "My App" });
    assert.strictEqual(parts.query, "id=app-123");
  });

  it("encodes special chars in appId", () => {
    const parts = buildLogUriParts({ id: "app/123 special", name: "test" });
    assert.ok(
      parts.query.startsWith("id="),
      `query should start with id=, got: ${parts.query}`,
    );
    assert.ok(
      !parts.query.includes(" "),
      `query should not contain spaces, got: ${parts.query}`,
    );
  });
});

describe("parseAppIdFromQuery", () => {
  it("extracts id from query string", () => {
    assert.strictEqual(parseAppIdFromQuery("id=app-123"), "app-123");
  });

  it("decodes percent-encoded id", () => {
    assert.strictEqual(parseAppIdFromQuery("id=app%2F123"), "app/123");
  });

  it("returns undefined for empty query", () => {
    assert.strictEqual(parseAppIdFromQuery(""), undefined);
  });

  it("returns undefined when id param is absent", () => {
    assert.strictEqual(parseAppIdFromQuery("foo=bar"), undefined);
  });

  it("returns undefined when id param is empty string", () => {
    assert.strictEqual(parseAppIdFromQuery("id="), undefined);
  });
});
