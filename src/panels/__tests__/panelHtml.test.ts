import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderPanelHtml } from "../panelHtml";

const FAKE_SCRIPT_URI = "vscode-extension://aurelion/media/panel-webview.js";
const FAKE_CYTOSCAPE_URI = "vscode-extension://aurelion/media/cytoscape.min.js";
const FAKE_DAGRE_URI = "vscode-extension://aurelion/media/dagre.min.js";
const FAKE_CYTOSCAPE_DAGRE_URI = "vscode-extension://aurelion/media/cytoscape-dagre.js";

function makeArgs(cspSource = "vscode-resource:") {
  return {
    nonce: "abc",
    cspSource,
    scriptUri: FAKE_SCRIPT_URI,
    cytoscapeUri: FAKE_CYTOSCAPE_URI,
    dagreUri: FAKE_DAGRE_URI,
    cytoscapeDagreUri: FAKE_CYTOSCAPE_DAGRE_URI,
  };
}

describe("renderPanelHtml", () => {
  it("contains the cspSource in the CSP meta tag", () => {
    const cspSource = "vscode-webview-resource:";
    const html = renderPanelHtml(makeArgs(cspSource));
    assert.ok(html.includes(cspSource), "CSP meta must include the cspSource");
  });

  it("contains the script src pointing to the provided scriptUri", () => {
    const html = renderPanelHtml(makeArgs());
    assert.ok(
      html.includes(`src="${FAKE_SCRIPT_URI}"`),
      "Script tag must reference the provided scriptUri",
    );
  });

  it("contains script tags for cytoscape, dagre, and cytoscape-dagre in correct order before main script", () => {
    const html = renderPanelHtml(makeArgs());
    const cytoIdx = html.indexOf(FAKE_CYTOSCAPE_URI);
    const dagreIdx = html.indexOf(FAKE_DAGRE_URI);
    const cytoDagreIdx = html.indexOf(FAKE_CYTOSCAPE_DAGRE_URI);
    const mainIdx = html.indexOf(FAKE_SCRIPT_URI);
    assert.ok(cytoIdx !== -1, "cytoscape script URI must be present");
    assert.ok(dagreIdx !== -1, "dagre script URI must be present");
    assert.ok(cytoDagreIdx !== -1, "cytoscape-dagre script URI must be present");
    assert.ok(cytoIdx < dagreIdx, "cytoscape must appear before dagre");
    assert.ok(dagreIdx < cytoDagreIdx, "dagre must appear before cytoscape-dagre");
    assert.ok(cytoDagreIdx < mainIdx, "cytoscape-dagre must appear before main script");
  });

  it("contains no external img src or external URLs in inline content", () => {
    const html = renderPanelHtml(makeArgs());
    assert.ok(!html.includes("<img"), "Must not contain <img> tags");
    assert.ok(!html.includes("http://"), "Must not contain external http:// URLs");
    assert.ok(!html.includes("https://"), "Must not contain external https:// URLs");
  });

  it("dag container skeleton is present with correct child ids", () => {
    const html = renderPanelHtml(makeArgs());
    assert.ok(html.includes('id="dag-container"'), "dag-container must be present");
    assert.ok(html.includes('id="dag-graph"'), "dag-graph must be present");
    assert.ok(html.includes('id="dag-args"'), "dag-args must be present");
    assert.ok(html.includes('id="dag-empty"'), "dag-empty must be present");
  });
});
