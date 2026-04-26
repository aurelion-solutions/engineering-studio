// @ts-nocheck
(function () {
  "use strict";

  const vscode = acquireVsCodeApi();

  const profileEl = /** @type {HTMLSelectElement} */ (document.getElementById("profile"));
  const promptEl = /** @type {HTMLTextAreaElement} */ (document.getElementById("prompt"));
  const runBtn = /** @type {HTMLButtonElement} */ (document.getElementById("run"));
  const streamBtn = /** @type {HTMLButtonElement} */ (document.getElementById("stream"));
  const abortBtn = /** @type {HTMLButtonElement} */ (document.getElementById("abort"));
  const statusEl = document.getElementById("status");
  const outputEl = document.getElementById("output");
  const footerEl = document.getElementById("footer");

  /** @param {string} text @param {'idle'|'running'|'streaming'|'error'} state */
  function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.className = state === "idle" ? "" : state;
  }

  function setRunning() {
    outputEl.textContent = "";
    footerEl.textContent = "";
    runBtn.disabled = true;
    streamBtn.disabled = true;
    abortBtn.disabled = false;
  }

  function restoreButtons() {
    runBtn.disabled = false;
    streamBtn.disabled = false;
    abortBtn.disabled = true;
  }

  /** @param {Object} result */
  function updateFooter(result) {
    const parts = [
      result.model ? `model: ${result.model}` : null,
      result.tokens_used != null ? `tokens: ${result.tokens_used}` : null,
      result.latency_ms != null ? `latency: ${result.latency_ms}ms` : null,
      result.ttft_ms != null ? `ttft: ${result.ttft_ms}ms` : null,
    ].filter(Boolean);
    footerEl.textContent = parts.join(" · ");
  }

  // ─── Message handler ────────────────────────────────────────────────────────
  window.addEventListener("message", (event) => {
    const msg = event.data;
    switch (msg.type) {
      case "profiles": {
        profileEl.innerHTML = "";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a profile…";
        profileEl.appendChild(placeholder);
        for (const item of msg.items) {
          const opt = document.createElement("option");
          opt.value = item.id;
          opt.textContent = item.modelName
            ? `${item.name} (${item.modelName})`
            : item.name;
          profileEl.appendChild(opt);
        }
        profileEl.disabled = false;
        setStatus("idle", "idle");
        break;
      }

      case "runStart":
        setStatus("running…", "running");
        setRunning();
        break;

      case "streamStart":
        setStatus("streaming…", "streaming");
        setRunning();
        break;

      case "runResult": {
        const r = msg.response;
        outputEl.textContent = JSON.stringify(r, null, 2);
        updateFooter(r);
        setStatus("done", "idle");
        restoreButtons();
        break;
      }

      case "streamChunk": {
        const chunk = msg.chunk;
        if (chunk.done) {
          if ("error" in chunk && chunk.error) {
            outputEl.textContent += `\n[error] ${chunk.error}`;
            setStatus("error", "error");
          } else {
            updateFooter(chunk);
            setStatus("done", "idle");
          }
          restoreButtons();
        } else {
          outputEl.textContent += chunk.token;
          // Auto-scroll
          outputEl.scrollTop = outputEl.scrollHeight;
        }
        break;
      }

      case "runAborted":
      case "streamAborted":
        outputEl.textContent += "\n[aborted]";
        setStatus("aborted", "idle");
        restoreButtons();
        break;

      case "error":
        outputEl.textContent += `\n[error] ${msg.message}`;
        setStatus("error", "error");
        restoreButtons();
        break;

      case "reload":
        // API base URL changed — reload profiles
        profileEl.disabled = true;
        profileEl.innerHTML = "<option>Loading profiles…</option>";
        setStatus("reloading…", "idle");
        vscode.postMessage({ type: "loadProfiles" });
        break;

      default:
        break;
    }
  });

  // ─── Button handlers ─────────────────────────────────────────────────────────

  function canSubmit() {
    return profileEl.value !== "" && promptEl.value.trim() !== "";
  }

  runBtn.addEventListener("click", () => {
    if (!canSubmit()) {
      return;
    }
    vscode.postMessage({
      type: "run",
      profileId: profileEl.value,
      prompt: promptEl.value,
    });
  });

  streamBtn.addEventListener("click", () => {
    if (!canSubmit()) {
      return;
    }
    vscode.postMessage({
      type: "stream",
      profileId: profileEl.value,
      prompt: promptEl.value,
    });
  });

  abortBtn.addEventListener("click", () => {
    vscode.postMessage({ type: "abort" });
  });

  // ─── Initial load ────────────────────────────────────────────────────────────
  vscode.postMessage({ type: "loadProfiles" });
})();
