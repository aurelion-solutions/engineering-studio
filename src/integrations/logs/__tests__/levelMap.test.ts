import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { levelPrefixFor } from "../levelMap";

describe("levelPrefixFor", () => {
  it("maps 'trace' → 'TRACE'", () => {
    assert.strictEqual(levelPrefixFor("trace"), "TRACE");
  });

  it("maps 'DEBUG' → 'DEBUG' (case-insensitive)", () => {
    assert.strictEqual(levelPrefixFor("DEBUG"), "DEBUG");
  });

  it("maps 'Info' → 'INFO' (mixed case)", () => {
    assert.strictEqual(levelPrefixFor("Info"), "INFO");
  });

  it("maps 'information' → 'INFO'", () => {
    assert.strictEqual(levelPrefixFor("information"), "INFO");
  });

  it("maps 'warn' → 'WARN'", () => {
    assert.strictEqual(levelPrefixFor("warn"), "WARN");
  });

  it("maps 'warning' → 'WARN'", () => {
    assert.strictEqual(levelPrefixFor("warning"), "WARN");
  });

  it("maps 'error' → 'ERROR'", () => {
    assert.strictEqual(levelPrefixFor("error"), "ERROR");
  });

  it("maps 'ERR' → 'ERROR'", () => {
    assert.strictEqual(levelPrefixFor("ERR"), "ERROR");
  });

  it("maps 'fatal' → 'ERROR'", () => {
    assert.strictEqual(levelPrefixFor("fatal"), "ERROR");
  });

  it("maps 'critical' → 'ERROR'", () => {
    assert.strictEqual(levelPrefixFor("critical"), "ERROR");
  });

  it("trims leading/trailing whitespace: '  Warn  ' → 'WARN'", () => {
    assert.strictEqual(levelPrefixFor("  Warn  "), "WARN");
  });

  it("maps null → 'INFO' (fallback)", () => {
    assert.strictEqual(levelPrefixFor(null), "INFO");
  });

  it("maps undefined → 'INFO' (fallback)", () => {
    assert.strictEqual(levelPrefixFor(undefined), "INFO");
  });

  it("maps empty string '' → 'INFO' (fallback)", () => {
    assert.strictEqual(levelPrefixFor(""), "INFO");
  });

  it("maps unknown value 'unknown' → 'INFO' (fallback)", () => {
    assert.strictEqual(levelPrefixFor("unknown"), "INFO");
  });
});
