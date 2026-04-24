import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ACCESS_ANALYSIS_CATEGORIES } from "../accessAnalysisCategories";
import type { AccessAnalysisCategoryFetcherName } from "../accessAnalysisCategories";

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

const EXPECTED_FETCHER_NAMES: AccessAnalysisCategoryFetcherName[] = [
  "fetchCapabilities",
  "fetchCapabilityMappings",
  "fetchCapabilityGrants",
  "fetchSodRules",
  "fetchFindings",
  "fetchMitigations",
  "fetchScanRuns",
  "fetchFeedbacks",
];

describe("ACCESS_ANALYSIS_CATEGORIES", () => {
  it("has exactly 8 unique keys", () => {
    assert.equal(ACCESS_ANALYSIS_CATEGORIES.length, 8);
    const keys = ACCESS_ANALYSIS_CATEGORIES.map((c) => c.key);
    const unique = new Set(keys);
    assert.equal(unique.size, 8, "All keys must be unique");
  });

  it("contains all expected keys", () => {
    const keys = ACCESS_ANALYSIS_CATEGORIES.map((c) => c.key);
    for (const expected of EXPECTED_KEYS) {
      assert.ok(
        keys.includes(expected),
        `Registry must contain key: ${expected}`,
      );
    }
  });

  it("each fetcherName matches the union literal type", () => {
    const fetchers = ACCESS_ANALYSIS_CATEGORIES.map((c) => c.fetcherName);
    for (const fetcher of fetchers) {
      assert.ok(
        (EXPECTED_FETCHER_NAMES as string[]).includes(fetcher),
        `Unexpected fetcherName: ${fetcher}`,
      );
    }
    assert.equal(
      new Set(fetchers).size,
      8,
      "All fetcherNames must be unique",
    );
  });

  it("column extractors return strings without throwing for minimal sample row", () => {
    const sampleRow = {
      id: 42,
      slug: "approve_payment",
      name: "Approve Payment",
      code: "SOD-001",
      capability_id: 1,
      resource_id: "res-uuid",
      subject_id: "subj-uuid",
      observed_at: "2026-01-01T00:00:00Z",
      severity: "high",
      status: "open",
      detected_at: "2026-01-01T00:00:00Z",
      rule_id: 10,
      control_id: 5,
      triggered_by: "manual",
      started_at: "2026-01-01T00:00:00Z",
      kind: "false_positive",
      message: "test feedback",
      created_at: "2026-01-01T00:00:00Z",
    };

    for (const cat of ACCESS_ANALYSIS_CATEGORIES) {
      for (const extractor of ["id", "name", "desc", "ts"] as const) {
        let result: string | undefined;
        try {
          result = cat.columns[extractor](sampleRow);
        } catch (err) {
          assert.fail(`Category ${cat.key} columns.${extractor} threw: ${String(err)}`);
        }
        assert.equal(
          typeof result,
          "string",
          `Category ${cat.key} columns.${extractor} must return string`,
        );
      }
    }
  });

  it("column extractors return empty string (not throw) for empty object", () => {
    for (const cat of ACCESS_ANALYSIS_CATEGORIES) {
      for (const extractor of ["id", "name", "desc", "ts"] as const) {
        let result: string | undefined;
        try {
          result = cat.columns[extractor]({});
        } catch (err) {
          assert.fail(`Category ${cat.key} columns.${extractor} threw on empty object: ${String(err)}`);
        }
        assert.equal(
          typeof result,
          "string",
          `Category ${cat.key} columns.${extractor} must return string for empty object`,
        );
      }
    }
  });
});
