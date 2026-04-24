/**
 * Pure function — returns the static HTML skeleton for all detail panels.
 * Fetch logic lives in the extension host; only DOM manipulation is in the inline script.
 */

export function renderPanelHtml(_nonce: string, cspSource: string, scriptUri: string): string {
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
    tbody tr[data-clickable] { cursor: pointer; }
    tbody tr[data-clickable]:hover { background: var(--vscode-list-hoverBackground, rgba(255,255,255,0.05)); }
  </style>
</head>
<body>
  <div id="status">Loading…</div>
  <div id="filter-bar" style="display:none; padding: 0 0 10px;">
    <div style="display:flex; gap:16px; flex-wrap:wrap;">
      <div id="corr-filter" style="display:none;">
        <label style="display:block; font-size:0.8em; opacity:0.6; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em;">Correlation ID</label>
        <input id="filter-input" type="text" placeholder="Filter by correlation ID…"
          style="width:260px; padding:4px 8px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border,#555); border-radius:3px; font-size:inherit;" />
      </div>
      <div id="msg-filter" style="display:none;">
        <label style="display:block; font-size:0.8em; opacity:0.6; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em;">Message</label>
        <input id="filter-msg" type="text" placeholder="Filter by message…"
          style="width:260px; padding:4px 8px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border,#555); border-radius:3px; font-size:inherit;" />
      </div>
    </div>
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
  <div id="extra-sections"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}
