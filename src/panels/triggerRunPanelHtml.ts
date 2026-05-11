/**
 * Pure function — returns the HTML skeleton for the Trigger Pipeline Run panel.
 * Client JS lives in media/trigger-run-webview.js, loaded via <script src>.
 * No data is embedded — everything is populated via webview messages.
 */
export function renderTriggerRunPanelHtml(
  nonce: string,
  cspSource: string,
  scriptUri: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}'; connect-src 'none';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aurelion: Trigger Pipeline Run</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 8px 16px;
      max-width: 700px;
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
    textarea {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.9em;
      resize: vertical;
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
    #error {
      display: none;
      color: var(--vscode-errorForeground);
      background: var(--vscode-inputValidation-errorBackground, rgba(255,0,0,0.1));
      border: 1px solid var(--vscode-inputValidation-errorBorder, #f44);
      border-radius: 3px;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 0.9em;
      white-space: pre-wrap;
      word-break: break-word;
    }
    #error.visible { display: block; }
  </style>
</head>
<body>
  <div class="field">
    <label for="pipelineName">Pipeline</label>
    <select id="pipelineName" disabled>
      <option value="">Loading pipelines…</option>
    </select>
  </div>
  <div class="field">
    <label for="argsText">Args (JSON object)</label>
    <textarea id="argsText" rows="8" placeholder="{}"></textarea>
  </div>
  <div class="btn-row">
    <button id="submit" disabled>Trigger run</button>
  </div>
  <div id="error"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
