/**
 * Pure-logic tests for pipelineStatusDefs.ts.
 * No `vscode` import — runs via `node --test` without any stub.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPipelineStatusDefs, type PipelineStatusDef } from "../pipelineStatusDefs";

const EXPECTED_ORDER = [
  "definitions",
  "running",
  "pending",
  "awaiting_event",
  "failed",
  "failed_timeout",
  "cancelled",
  "completed",
] as const;

describe("buildPipelineStatusDefs", () => {
  it("returns_eight_defs_in_declared_order", () => {
    const defs = buildPipelineStatusDefs();
    assert.equal(defs.length, 8);
    const keys = defs.map((d) => d.key);
    assert.deepEqual(keys, [...EXPECTED_ORDER]);
  });

  it("each_def_has_unique_non_empty_fields", () => {
    const defs = buildPipelineStatusDefs();
    const keys = (defs as PipelineStatusDef[]).map((d) => d.key);
    const labels = (defs as PipelineStatusDef[]).map((d) => d.label);
    const icons = (defs as PipelineStatusDef[]).map((d) => d.iconId);

    // All non-empty strings
    for (const def of defs as PipelineStatusDef[]) {
      assert.ok(def.key.length > 0, `key is empty for def: ${JSON.stringify(def)}`);
      assert.ok(def.label.length > 0, `label is empty for key: ${def.key}`);
      assert.ok(def.iconId.length > 0, `iconId is empty for key: ${def.key}`);
    }

    // All unique
    assert.equal(new Set(keys).size, 8, "keys are not unique");
    assert.equal(new Set(labels).size, 8, "labels are not unique");
    assert.equal(new Set(icons).size, 8, "iconIds are not unique");
  });

  it("status_keys_match_orchestrator_enum_and_definitions_marker", () => {
    // First key `definitions` is a UI-only marker with no enum counterpart.
    // Remaining 7 keys are real PipelineRunStatus enum values
    // (aurelion-kernel/src/platform/orchestrator/models.py:26–41).
    // `cancelling` is deliberately omitted — transient state surfaced under `running` in 25b.
    // `failed_timeout` is a real kernel enum value (models.py:40), not synthetic.
    const defs = buildPipelineStatusDefs();
    const keys = defs.map((d) => d.key);
    assert.deepEqual(keys, [
      "definitions",
      "running",
      "pending",
      "awaiting_event",
      "failed",
      "failed_timeout",
      "cancelled",
      "completed",
    ]);
  });

  it("icons_use_codicon_ids", () => {
    const defs = buildPipelineStatusDefs();
    const codiconPattern = /^[a-z0-9~-]+$/;
    for (const def of defs as PipelineStatusDef[]) {
      assert.match(
        def.iconId,
        codiconPattern,
        `iconId "${def.iconId}" for key "${def.key}" does not match codicon pattern`,
      );
    }
  });
});
