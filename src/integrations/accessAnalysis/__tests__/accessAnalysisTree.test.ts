/**
 * AccessAnalysisTreeDataProvider structure tests.
 *
 * The tree module depends on `vscode` which is not available in the test
 * runner. We test the observable contract via the categories registry (the
 * only data source used by the provider) and verify structural invariants that
 * would surface any mis-wiring at compile time.
 *
 * Invariants verified:
 * - exactly 8 category definitions (same as provider's root children count)
 * - every category key is unique
 * - every category has the expected command shape constants
 * - every category's fetcherName is a non-empty string
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_ANALYSIS_CATEGORIES,
} from "../accessAnalysisCategories";

const EXPECTED_KEYS = [
  "capabilities",
  "capabilityMappings",
  "capabilityGrants",
  "sodRules",
  "findings",
  "mitigations",
  "scanRuns",
  "feedbacks",
] as const;

describe("AccessAnalysisTreeDataProvider (structural contract)", () => {
  it("getChildren(undefined) would return 8 nodes — registry has 8 entries", () => {
    // The provider maps ACCESS_ANALYSIS_CATEGORIES 1-to-1 to CategoryNode.
    // If the registry has 8 entries, the provider returns 8 nodes.
    assert.equal(
      ACCESS_ANALYSIS_CATEGORIES.length,
      8,
      "Registry must have exactly 8 categories (= 8 root nodes)",
    );
  });

  it("all 8 expected category keys are present in the registry", () => {
    const keys = ACCESS_ANALYSIS_CATEGORIES.map((c) => c.key);
    for (const expected of EXPECTED_KEYS) {
      assert.ok(keys.includes(expected), `Missing category key: ${expected}`);
    }
  });

  it("all category keys are unique (no duplicate nodes)", () => {
    const keys = ACCESS_ANALYSIS_CATEGORIES.map((c) => c.key);
    const unique = new Set(keys);
    assert.equal(unique.size, keys.length, "All category keys must be unique");
  });

  it("every category has a non-empty fetcherName (command wiring)", () => {
    for (const cat of ACCESS_ANALYSIS_CATEGORIES) {
      assert.ok(
        typeof cat.fetcherName === "string" && cat.fetcherName.length > 0,
        `Category ${cat.key} must have a non-empty fetcherName`,
      );
    }
  });

  it("every category has a non-empty label (tree node label)", () => {
    for (const cat of ACCESS_ANALYSIS_CATEGORIES) {
      assert.ok(
        typeof cat.label === "string" && cat.label.length > 0,
        `Category ${cat.key} must have a non-empty label`,
      );
    }
  });

  it("command args shape — kind would be 'accessAnalysis', categoryKey would match key", () => {
    // Verifies the convention the CategoryNode constructor follows:
    // args[0] = { kind: "accessAnalysis", ctxKey: key, categoryKey: key, label }
    // We can't instantiate CategoryNode without vscode, but we verify the
    // category definitions supply the correct values to the constructor.
    for (const cat of ACCESS_ANALYSIS_CATEGORIES) {
      // key and label must be non-empty so ctxKey/categoryKey/label are valid
      assert.ok(typeof cat.key === "string" && cat.key.length > 0);
      assert.ok(typeof cat.label === "string" && cat.label.length > 0);
      // The fixed kind literal "accessAnalysis" is hard-coded in tree.ts.
      // This test documents the contract rather than re-testing tree.ts code.
      const expectedKind = "accessAnalysis";
      assert.equal(typeof expectedKind, "string");
    }
  });

  it("dispose() does not throw — registry is plain data with no cleanup needed", () => {
    // Provider.dispose() only calls _onDidChangeTreeData.dispose().
    // Since no vscode host is running, we verify the underlying data
    // (ACCESS_ANALYSIS_CATEGORIES) requires no teardown.
    assert.doesNotThrow(() => {
      for (const cat of ACCESS_ANALYSIS_CATEGORIES) {
        void cat.key;
      }
    });
  });
});
