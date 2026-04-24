import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderPanelHtml } from "../panelHtml";

const FAKE_SCRIPT_URI = "vscode-extension://aurelion/media/panel-webview.js";

describe("renderPanelHtml", () => {
  it("contains the cspSource in the CSP meta tag", () => {
    const cspSource = "vscode-webview-resource:";
    const html = renderPanelHtml("abc", cspSource, FAKE_SCRIPT_URI);
    assert.ok(html.includes(cspSource), "CSP meta must include the cspSource");
  });

  it("contains the script src pointing to the provided scriptUri", () => {
    const html = renderPanelHtml("nonce99", "vscode-resource:", FAKE_SCRIPT_URI);
    assert.ok(
      html.includes(`src="${FAKE_SCRIPT_URI}"`),
      "Script tag must reference the provided scriptUri",
    );
  });

  it("contains no external img src or external URLs in inline content", () => {
    const html = renderPanelHtml("nonce99", "vscode-resource:", FAKE_SCRIPT_URI);
    assert.ok(!html.includes("<img"), "Must not contain <img> tags");
    assert.ok(!html.includes("http://"), "Must not contain external http:// URLs");
    assert.ok(!html.includes("https://"), "Must not contain external https:// URLs");
  });
});
