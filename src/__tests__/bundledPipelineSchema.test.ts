/**
 * Bundled pipeline schema tests — three cases:
 *   1. bundled_schema_is_valid_json  — parse + structural assertions
 *   2. bundled_schema_matches_kernel_source — drift guard (skip when kernel unreachable)
 *   3. manifest_declares_yamlValidation_and_dependency — package.json assertions
 *
 * Only node:assert/strict, node:fs, node:path, node:test — no external deps.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";

// __dirname at runtime = <extension-root>/out/__tests__
// Two levels up  → <extension-root>
const ROOT = path.resolve(__dirname, "..", "..");
const BUNDLED_PATH = path.join(ROOT, "schemas", "aurelion-pipeline.schema.json");

// Four levels up from out/__tests__  → code/
// then into aurelion-kernel
const KERNEL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "aurelion-kernel",
  "pipelines",
  "schema.json",
);

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Walk two parsed JSON trees in parallel and return the first JSON Pointer
 * path where they diverge, or null if they are equal.
 */
function firstDivergentPointer(
  a: unknown,
  b: unknown,
  pointer = "",
): string | null {
  if (typeof a !== typeof b) return pointer || "/";
  if (Array.isArray(a) !== Array.isArray(b)) return pointer || "/";

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return pointer || "/";
    for (let i = 0; i < a.length; i++) {
      const sub = firstDivergentPointer(a[i], b[i], `${pointer}/${i}`);
      if (sub !== null) return sub;
    }
    return null;
  }

  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj).sort();
    const bKeys = Object.keys(bObj).sort();
    if (aKeys.join(",") !== bKeys.join(",")) return pointer || "/";
    for (const k of aKeys) {
      const sub = firstDivergentPointer(aObj[k], bObj[k], `${pointer}/${k}`);
      if (sub !== null) return sub;
    }
    return null;
  }

  return a === b ? null : pointer || "/";
}

// ─── Test 1: bundled schema is valid JSON with expected structure ─────────────

describe("bundled_schema_is_valid_json", () => {
  it("bundled schema file exists and parses as JSON", () => {
    assert.ok(
      fs.existsSync(BUNDLED_PATH),
      `Bundled schema not found at: ${BUNDLED_PATH}`,
    );
    const raw = fs.readFileSync(BUNDLED_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(typeof parsed, "object");
  });

  it("bundled schema has correct $id", () => {
    const parsed = JSON.parse(fs.readFileSync(BUNDLED_PATH, "utf8")) as Record<string, unknown>;
    assert.equal(
      parsed["$id"],
      "https://aurelion.dev/schemas/pipeline.schema.json",
    );
  });

  it("bundled schema has correct title", () => {
    const parsed = JSON.parse(fs.readFileSync(BUNDLED_PATH, "utf8")) as Record<string, unknown>;
    assert.equal(parsed["title"], "Aurelion Pipeline Definition");
  });

  it("bundled schema type is object", () => {
    const parsed = JSON.parse(fs.readFileSync(BUNDLED_PATH, "utf8")) as Record<string, unknown>;
    assert.equal(parsed["type"], "object");
  });

  it("bundled schema required includes pipeline", () => {
    const parsed = JSON.parse(fs.readFileSync(BUNDLED_PATH, "utf8")) as Record<string, unknown>;
    const required = parsed["required"] as string[];
    assert.ok(Array.isArray(required), "required must be an array");
    assert.ok(required.includes("pipeline"), "required must include 'pipeline'");
  });
});

// ─── Test 2: drift guard ──────────────────────────────────────────────────────

describe("bundled_schema_matches_kernel_source", () => {
  it("bundled schema matches kernel source (or skips if kernel unreachable)", (t) => {
    if (!fs.existsSync(KERNEL_PATH)) {
      t.skip(
        "kernel schema not present in this checkout — drift guard inactive",
      );
      return;
    }

    const bundled = JSON.parse(fs.readFileSync(BUNDLED_PATH, "utf8")) as unknown;
    const kernel = JSON.parse(fs.readFileSync(KERNEL_PATH, "utf8")) as unknown;

    const divergentPointer = firstDivergentPointer(bundled, kernel);
    assert.equal(
      divergentPointer,
      null,
      `Bundled schema diverges from kernel source at JSON Pointer: ${divergentPointer}. ` +
        `Update aurelion-engineering-studio/schemas/aurelion-pipeline.schema.json to match ` +
        `aurelion-kernel/pipelines/schema.json.`,
    );
  });
});

// ─── Test 3: manifest assertions ─────────────────────────────────────────────

describe("manifest_declares_yamlValidation_and_dependency", () => {
  type YamlValidationEntry = {
    fileMatch: string[];
    url: string;
  };
  type Manifest = {
    extensionDependencies?: string[];
    contributes?: {
      yamlValidation?: YamlValidationEntry[];
    };
  };

  const PKG = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as Manifest;

  it("contributes.yamlValidation is a non-empty array", () => {
    const yamlValidation = PKG.contributes?.yamlValidation;
    assert.ok(
      Array.isArray(yamlValidation) && yamlValidation.length > 0,
      "contributes.yamlValidation must be a non-empty array",
    );
  });

  it("every yamlValidation entry has fileMatch (non-empty string[]) and url (string)", () => {
    const yamlValidation = PKG.contributes?.yamlValidation ?? [];
    for (const entry of yamlValidation) {
      assert.ok(
        Array.isArray(entry.fileMatch) && entry.fileMatch.length > 0,
        `yamlValidation entry missing fileMatch: ${JSON.stringify(entry)}`,
      );
      assert.equal(
        typeof entry.url,
        "string",
        `yamlValidation entry missing url: ${JSON.stringify(entry)}`,
      );
    }
  });

  it("at least one yamlValidation entry points to the bundled schema", () => {
    const yamlValidation = PKG.contributes?.yamlValidation ?? [];
    const hasEntry = yamlValidation.some(
      (e) => e.url === "./schemas/aurelion-pipeline.schema.json",
    );
    assert.ok(
      hasEntry,
      "No yamlValidation entry with url './schemas/aurelion-pipeline.schema.json' found",
    );
  });

  it("extensionDependencies includes redhat.vscode-yaml", () => {
    const deps = PKG.extensionDependencies ?? [];
    assert.ok(
      deps.includes("redhat.vscode-yaml"),
      `extensionDependencies must include "redhat.vscode-yaml", got: ${JSON.stringify(deps)}`,
    );
  });
});
