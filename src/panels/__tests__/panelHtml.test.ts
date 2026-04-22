import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderPanelHtml } from "../panelHtml";

describe("renderPanelHtml", () => {
  it("contains the nonce exactly twice (meta CSP + script tag)", () => {
    const nonce = "testNonce123";
    const html = renderPanelHtml(nonce, "vscode-resource:");
    const count = (html.match(new RegExp(nonce, "g")) ?? []).length;
    assert.equal(count, 2, `Expected nonce to appear 2 times, got ${count}`);
  });

  it("CSP meta contains the cspSource", () => {
    const cspSource = "vscode-webview-resource:";
    const html = renderPanelHtml("abc", cspSource);
    assert.ok(
      html.includes(cspSource),
      "CSP meta must include the cspSource",
    );
  });

  it("contains no external img src or external URLs in inline content", () => {
    const html = renderPanelHtml("nonce99", "vscode-resource:");
    assert.ok(!html.includes("<img"), "Must not contain <img> tags");
    assert.ok(!html.includes("http://"), "Must not contain external http:// URLs");
    assert.ok(!html.includes("https://"), "Must not contain external https:// URLs");
  });
});
