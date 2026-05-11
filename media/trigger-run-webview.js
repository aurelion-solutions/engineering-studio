// @ts-check
/**
 * Webview script for the Trigger Pipeline Run panel.
 * Plain JS, no bundler. Communicates with TriggerRunPanelController via postMessage.
 *
 * Message protocol (host → webview):
 *   { type: "pipelines", names: string[] }
 *   { type: "submitOk" }          — host disposes the panel, this is a no-op guard
 *   { type: "submitError", detail: string }
 *   { type: "reload" }            — re-request loadPipelines, clear error
 *
 * Message protocol (webview → host):
 *   { type: "loadPipelines" }
 *   { type: "submit", pipelineName: string, args: object }
 */

(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  const select = /** @type {HTMLSelectElement} */ (document.getElementById("pipelineName"));
  const argsText = /** @type {HTMLTextAreaElement} */ (document.getElementById("argsText"));
  const submitBtn = /** @type {HTMLButtonElement} */ (document.getElementById("submit"));
  const errorDiv = /** @type {HTMLDivElement} */ (document.getElementById("error"));

  /** @param {string} msg */
  function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.classList.add("visible");
  }

  function clearError() {
    errorDiv.textContent = "";
    errorDiv.classList.remove("visible");
  }

  /** @param {string[]} names */
  function populatePipelines(names) {
    select.innerHTML = "";
    if (names.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No pipelines found";
      select.appendChild(opt);
      return;
    }
    for (const name of names) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }
    select.disabled = false;
    submitBtn.disabled = false;
  }

  /** @returns {{ ok: boolean, value?: object, error?: string }} */
  function parseArgsLocal() {
    const raw = argsText.value.trim();
    if (raw === "") {
      return { ok: false, error: "Args must not be empty. Use {} for no args." };
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        error: 'Args must be a JSON object, e.g. {} or {"key": "value"}.',
      };
    }
    return { ok: true, value: parsed };
  }

  /**
   * Extract a human-readable detail string from an unknown submitError detail.
   * @param {unknown} detail
   * @returns {string}
   */
  function _extractErrorDetail(detail) {
    if (typeof detail === "string") {
      return detail;
    }
    try {
      return JSON.stringify(detail, null, 2);
    } catch {
      return String(detail);
    }
  }

  submitBtn.addEventListener("click", () => {
    clearError();
    const pipelineName = select.value;
    if (!pipelineName) {
      showError("Please select a pipeline.");
      return;
    }
    const argsResult = parseArgsLocal();
    if (!argsResult.ok) {
      showError(argsResult.error ?? "Invalid args.");
      return;
    }
    submitBtn.disabled = true;
    vscode.postMessage({ type: "submit", pipelineName, args: argsResult.value });
  });

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || typeof msg.type !== "string") {
      return;
    }
    switch (msg.type) {
      case "pipelines":
        populatePipelines(Array.isArray(msg.names) ? msg.names : []);
        break;
      case "submitOk":
        // Panel will be disposed by host; nothing to do here.
        break;
      case "submitError":
        submitBtn.disabled = false;
        showError(_extractErrorDetail(msg.detail));
        break;
      case "reload":
        clearError();
        select.innerHTML = "<option value=''>Loading pipelines…</option>";
        select.disabled = true;
        submitBtn.disabled = true;
        vscode.postMessage({ type: "loadPipelines" });
        break;
      default:
        break;
    }
  });

  // Initial load.
  // The script tag is placed at the end of <body>, so readyState is already
  // "interactive" by the time this runs — DOMContentLoaded may or may not
  // have fired yet depending on the VS Code webview engine version.
  // Use a single idempotency-guarded call to avoid double requests.
  let _loadPipelinesRequested = false;
  function _requestLoadPipelines() {
    if (_loadPipelinesRequested) { return; }
    _loadPipelinesRequested = true;
    vscode.postMessage({ type: "loadPipelines" });
  }

  document.addEventListener("DOMContentLoaded", _requestLoadPipelines);
  _requestLoadPipelines();
})();
