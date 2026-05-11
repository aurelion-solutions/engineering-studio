import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";

const HTML_PATH = path.resolve(__dirname, "..", "triggerRunPanelHtml.js");

type HtmlModule = {
  renderTriggerRunPanelHtml: (
    nonce: string,
    cspSource: string,
    scriptUri: string,
  ) => string;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderTriggerRunPanelHtml } = require(HTML_PATH) as HtmlModule;

const NONCE = "testNonce42";
const CSP = "vscode-resource:";
const SCRIPT_URI = "vscode-resource://media/trigger-run-webview.js";

function render(): string {
  return renderTriggerRunPanelHtml(NONCE, CSP, SCRIPT_URI);
}

describe("renderTriggerRunPanelHtml", () => {
  it("contains <select id=\"pipelineName\">", () => {
    assert.ok(render().includes('<select id="pipelineName"'));
  });

  it("contains <textarea id=\"argsText\">", () => {
    assert.ok(render().includes('<textarea id="argsText"'));
  });

  it("contains submit button", () => {
    assert.ok(render().includes('<button id="submit"'));
  });

  it("contains nonce in CSP meta tag", () => {
    assert.ok(render().includes(`nonce-${NONCE}`));
  });

  it("script tag src equals the passed scriptUri", () => {
    assert.ok(render().includes(`src="${SCRIPT_URI}"`));
  });

  it("script tag carries the nonce attribute", () => {
    assert.ok(render().includes(`nonce="${NONCE}"`));
  });

  it("contains error div", () => {
    assert.ok(render().includes('<div id="error">'));
  });
});
