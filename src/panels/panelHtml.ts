/**
 * Pure function — returns the static HTML skeleton for all detail panels.
 * Fetch logic lives in the extension host; only DOM manipulation is in the inline script.
 */

export interface RenderPanelHtmlArgs {
  nonce: string;
  cspSource: string;
  scriptUri: string;
  cytoscapeUri: string;
  dagreUri: string;
  cytoscapeDagreUri: string;
}

export function renderPanelHtml(args: RenderPanelHtmlArgs): string {
  const { cspSource, scriptUri, cytoscapeUri, dagreUri, cytoscapeDagreUri } = args;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aurelion Detail</title>
  <style>
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 8px 16px; }
    #status { padding: 8px 0; opacity: 0.7; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--vscode-panel-border); font-weight: 600; }
    td { padding: 4px 8px; border-bottom: 1px solid var(--vscode-panel-border, #444); vertical-align: top; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-size: 0.85em; }
    .level-debug { opacity: 0.6; }
    .level-info { color: var(--vscode-terminal-ansiBlue); }
    .level-warning { color: var(--vscode-editorWarning-foreground); }
    .level-error { color: var(--vscode-errorForeground); }
    .level-critical { color: var(--vscode-errorForeground); font-weight: bold; }
    .ts { font-size: 0.85em; opacity: 0.7; white-space: nowrap; }
    .kv-key { opacity: 0.7; }
    .edit-input { padding: 3px 6px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #555); border-radius: 3px; font-size: inherit; font-family: inherit; width: 100%; box-sizing: border-box; }
    .edit-input:focus { outline: 1px solid var(--vscode-focusBorder); }
    #save-bar { display: none; padding: 10px 0 4px; align-items: center; justify-content: flex-end; gap: 10px; }
    #save-btn { padding: 4px 14px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; font-size: inherit; cursor: pointer; }
    #save-btn:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
    #save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    #save-status { font-size: 0.85em; opacity: 0.7; min-width: 48px; text-align: right; }
    .extra-section { margin-top: 24px; }
    .extra-section-title { font-size: 0.8em; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 6px; border-bottom: 1px solid var(--vscode-panel-border, #444); margin-bottom: 4px; }
    .status-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 0.8em; font-weight: 600; letter-spacing: 0.03em; }
    .status-online { background: rgba(35, 134, 54, 0.25); color: #3fb950; border: 1px solid rgba(63, 185, 80, 0.4); }
    .status-offline { background: rgba(248, 81, 73, 0.15); color: #f85149; border: 1px solid rgba(248, 81, 73, 0.3); opacity: 0.85; }
    tbody tr[data-clickable], .extra-section tr[data-clickable] { cursor: pointer; }
    tbody tr[data-clickable]:hover, .extra-section tr[data-clickable]:hover { background: var(--vscode-list-hoverBackground, rgba(255,255,255,0.05)); }
    th { position: relative; user-select: none; }
    .col-resize-handle { position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; z-index: 1; }
    .col-resize-handle:hover, .col-resize-handle.dragging { background: var(--vscode-focusBorder, #007fd4); opacity: 0.6; }
    #dag-container { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
    #dag-graph { width: 100%; height: 440px; min-height: 440px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; }
    #dag-args-title { font-size: 0.8em; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; padding: 0 0 4px; display: none; }
    #dag-args { width: 100%; max-height: 260px; overflow: auto; margin: 0; padding: 10px 12px; background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border); border-radius: 6px; font-family: var(--vscode-editor-font-family); font-size: 0.9em; white-space: pre; display: none; }
    #dag-empty { display: none; padding: 8px 0; opacity: 0.7; }
    .json-block { margin: 0; font-family: var(--vscode-editor-font-family, monospace); font-size: 0.9em; white-space: pre; line-height: 1.45; }
    .json-key { color: var(--vscode-symbolIcon-propertyForeground, var(--vscode-terminal-ansiBrightBlue, #9cdcfe)); }
    .json-string { color: var(--vscode-debugTokenExpression-string, var(--vscode-terminal-ansiBrightGreen, #ce9178)); }
    .json-number { color: var(--vscode-debugTokenExpression-number, var(--vscode-terminal-ansiBlue, #b5cea8)); }
    .json-bool { color: var(--vscode-debugTokenExpression-boolean, var(--vscode-terminal-ansiBrightMagenta, #569cd6)); font-weight: 600; }
    .json-null { color: var(--vscode-debugTokenExpression-value, var(--vscode-disabledForeground, #888)); font-style: italic; }
    .json-punctuation { color: var(--vscode-foreground); opacity: 0.65; }
    #dag-args.json-block { padding: 10px 12px; }
  </style>
</head>
<body>
  <div id="status">Loading…</div>
  <div id="filter-bar" style="display:none; padding: 0 0 10px;">
    <div id="filter-inputs" style="display:flex; gap:16px; flex-wrap:wrap;"></div>
    <div id="ts-filter" style="display:none;">
      <hr style="border:none; border-top:1px solid var(--vscode-panel-border,#444); margin: 4px 0 8px;" />
      <label style="display:block; font-size:0.8em; opacity:0.6; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em;">Time Period (UTC)</label>
      <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center;">
        <div>
          <span style="font-size:0.85em; opacity:0.7; margin-right:4px;">From</span>
          <input id="ts-from" type="datetime-local"
            style="padding:3px 6px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border,#555); border-radius:3px; font-size:inherit; color-scheme:dark;" />
        </div>
        <div>
          <span style="font-size:0.85em; opacity:0.7; margin-right:4px;">To</span>
          <input id="ts-to" type="datetime-local"
            style="padding:3px 6px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border,#555); border-radius:3px; font-size:inherit; color-scheme:dark;" />
        </div>
      </div>
    </div>
  </div>
  <div id="save-bar">
    <span id="save-status"></span>
    <button id="save-btn">Save changes</button>
  </div>
  <table id="rows-table" style="display:none">
    <thead id="thead"><tr></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <div id="dag-container" style="display:none">
    <div id="dag-graph"></div>
    <div id="dag-args-title"></div>
    <pre id="dag-args"></pre>
    <div id="dag-empty">No steps</div>
  </div>
  <div id="extra-sections"></div>
  <script src="${cytoscapeUri}"></script>
  <script src="${dagreUri}"></script>
  <script src="${cytoscapeDagreUri}"></script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}
