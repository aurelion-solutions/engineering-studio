/**
 * Pure function — returns the HTML skeleton for the LLM Inference panel.
 * Client JS lives in media/inference-webview.js, loaded via <script src>.
 */
export function renderInferencePanelHtml(
  nonce: string,
  cspSource: string,
  scriptUri: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; connect-src 'none';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aurelion LLM Inference</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 8px 16px;
      max-width: 900px;
    }
    label {
      display: block;
      font-size: 0.8em;
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    select, textarea {
      width: 100%;
      box-sizing: border-box;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, #555);
      border-radius: 3px;
      font-size: inherit;
      font-family: inherit;
      padding: 4px 8px;
    }
    select:focus, textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    select:disabled {
      opacity: 0.5;
    }
    .field { margin-bottom: 12px; }
    .btn-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    button {
      padding: 4px 14px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      font-size: inherit;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }
    button.secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    #status {
      font-size: 0.85em;
      opacity: 0.7;
      padding: 4px 0 8px;
      min-height: 1.2em;
    }
    #status.running { color: var(--vscode-terminal-ansiBlue); opacity: 1; }
    #status.streaming { color: var(--vscode-terminal-ansiGreen); opacity: 1; }
    #status.error { color: var(--vscode-errorForeground); opacity: 1; }
    #output {
      width: 100%;
      box-sizing: border-box;
      min-height: 120px;
      max-height: 500px;
      overflow-y: auto;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border, #444);
      border-radius: 3px;
      padding: 8px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.9em;
      margin-bottom: 8px;
    }
    #footer {
      font-size: 0.8em;
      opacity: 0.6;
      min-height: 1.2em;
    }
  </style>
</head>
<body>
  <div class="field">
    <label for="profile">Execution Profile</label>
    <select id="profile" disabled>
      <option value="">Loading profiles…</option>
    </select>
  </div>
  <div class="field">
    <label for="prompt">Prompt</label>
    <textarea id="prompt" rows="6" placeholder="Enter your prompt…"></textarea>
  </div>
  <div class="btn-row">
    <button id="run">Run</button>
    <button id="stream" class="secondary">Stream</button>
    <button id="abort" class="secondary" disabled>Abort</button>
  </div>
  <div id="status">idle</div>
  <pre id="output"></pre>
  <div id="footer"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
