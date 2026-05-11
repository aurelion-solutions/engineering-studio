import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";

const MODEL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "out",
  "integrations",
  "pipelines",
  "triggerForm",
  "triggerFormModel.js",
);

type ModelModule = {
  parseArgsJson: (text: string) => { ok: boolean; value?: Record<string, unknown>; error?: string };
  validatePipelineName: (name: string, known: ReadonlyArray<string>) => { ok: boolean; error?: string };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseArgsJson, validatePipelineName } = require(MODEL_PATH) as ModelModule;

describe("parseArgsJson", () => {
  it('"{}" → ok:true, value:{}', () => {
    const r = parseArgsJson("{}");
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, {});
  });

  it('\'{"a":1}\' → ok:true, value:{a:1}', () => {
    const r = parseArgsJson('{"a":1}');
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, { a: 1 });
  });

  it('"" → ok:false', () => {
    const r = parseArgsJson("");
    assert.equal(r.ok, false);
  });

  it('"   " (whitespace) → ok:false', () => {
    const r = parseArgsJson("   ");
    assert.equal(r.ok, false);
  });

  it('"null" → ok:false', () => {
    const r = parseArgsJson("null");
    assert.equal(r.ok, false);
  });

  it('"42" → ok:false', () => {
    const r = parseArgsJson("42");
    assert.equal(r.ok, false);
  });

  it('"hi" → ok:false', () => {
    const r = parseArgsJson('"hi"');
    assert.equal(r.ok, false);
  });

  it('"[1,2]" → ok:false', () => {
    const r = parseArgsJson("[1,2]");
    assert.equal(r.ok, false);
  });

  it('"{" → ok:false, error contains parser message', () => {
    const r = parseArgsJson("{");
    assert.equal(r.ok, false);
    assert.ok(
      typeof r.error === "string" && r.error.length > 0,
      "error should be a non-empty string",
    );
  });
});

describe("validatePipelineName", () => {
  it('"" with ["a"] → ok:false', () => {
    const r = validatePipelineName("", ["a"]);
    assert.equal(r.ok, false);
  });

  it('"b" with ["a"] → ok:false', () => {
    const r = validatePipelineName("b", ["a"]);
    assert.equal(r.ok, false);
  });

  it('"a" with ["a"] → ok:true', () => {
    const r = validatePipelineName("a", ["a"]);
    assert.equal(r.ok, true);
  });
});
