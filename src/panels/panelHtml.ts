/**
 * Pure function — returns the static HTML skeleton for all detail panels.
 * Fetch logic lives in the extension host; only DOM manipulation is in the inline script.
 */

export function renderPanelHtml(nonce: string, cspSource: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
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
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const statusEl = document.getElementById('status');
    const tableEl = document.getElementById('rows-table');
    const theadRow = document.querySelector('#thead tr');
    const tbodyEl = document.getElementById('rows');
    const extraSectionsEl = document.getElementById('extra-sections');
    const filterBar = document.getElementById('filter-bar');
    const corrFilter = document.getElementById('corr-filter');
    const filterInput = document.getElementById('filter-input');
    const msgFilter = document.getElementById('msg-filter');
    const filterMsg = document.getElementById('filter-msg');
    const tsFilter = document.getElementById('ts-filter');
    const tsFrom = document.getElementById('ts-from');
    const tsTo = document.getElementById('ts-to');
    const saveBar = document.getElementById('save-bar');
    const saveBtn = document.getElementById('save-btn');
    const saveStatus = document.getElementById('save-status');
    let activeAppId = undefined;
    let originalEditValues = {};

    function checkEditDirty() {
      const inputs = tbodyEl.querySelectorAll('.edit-input');
      let dirty = false;
      inputs.forEach(function(el) {
        if (originalEditValues[el.dataset.fieldId] !== el.value) { dirty = true; }
      });
      saveBtn.disabled = !dirty;
    }

    tbodyEl.addEventListener('input', function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('edit-input')) {
        checkEditDirty();
      }
    });

    let activeFilterBy = undefined;
    let activeFilterByMsg = undefined;
    let activeFilterByTs = false;

    function applyFilters() {
      const q = filterInput.value.toLowerCase();
      const qMsg = filterMsg.value.toLowerCase();
      const fromMs = tsFrom.value ? new Date(tsFrom.value + 'Z').getTime() : null;
      const toMs = tsTo.value ? new Date(tsTo.value + 'Z').getTime() : null;
      Array.from(tbodyEl.querySelectorAll('tr')).forEach(function(tr) {
        const corrVal = (tr.dataset.filterValue || '').toLowerCase();
        const msgVal = (tr.dataset.msgValue || '').toLowerCase();
        const matchCorr = q === '' || corrVal.includes(q);
        const matchMsg = qMsg === '' || msgVal.includes(qMsg);
        let matchTs = true;
        if (activeFilterByTs && tr.dataset.ts) {
          const rowMs = new Date(tr.dataset.ts).getTime();
          if (fromMs !== null && rowMs < fromMs) { matchTs = false; }
          if (toMs !== null && rowMs > toMs) { matchTs = false; }
        }
        tr.style.display = (matchCorr && matchMsg && matchTs) ? '' : 'none';
      });
    }

    saveBtn.addEventListener('click', function() {
      if (!activeAppId) { return; }
      const inputs = tbodyEl.querySelectorAll('.edit-input');
      const payload = {};
      inputs.forEach(function(el) {
        const fid = el.dataset.fieldId;
        if (fid === 'kv-name') { payload.name = el.value.trim(); }
        if (fid === 'kv-is_active') { payload.is_active = el.value === 'true'; }
        if (fid === 'kv-required_tags') {
          payload.required_connector_tags = el.value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        }
      });
      saveStatus.textContent = 'Saving…';
      vscode.postMessage({ type: 'patch', appId: activeAppId, payload: payload });
    });

    filterInput.addEventListener('input', function() {
      const cleaned = filterInput.value.replace(/\s/g, '');
      if (cleaned !== filterInput.value) { filterInput.value = cleaned; }
      applyFilters();
    });
    filterMsg.addEventListener('input', applyFilters);
    tsFrom.addEventListener('input', applyFilters);
    tsTo.addEventListener('input', applyFilters);

    function encodeCell(cell) {
      switch (cell.kind) {
        case 'badge':
          return '<span class="badge">' + escapeHtml(cell.value) + '</span>';
        case 'level': {
          const lvl = cell.value.toLowerCase();
          return '<span class="level-' + lvl + '">' + escapeHtml(cell.value.toUpperCase()) + '</span>';
        }
        case 'ts':
          return '<span class="ts">' + escapeHtml(cell.value) + '</span>';
        case 'kv':
          return '<span class="kv-key">' + escapeHtml(cell.value) + '</span>'
            + (cell.extra ? ': ' + escapeHtml(cell.extra) : '');
        case 'status': {
          const cls = cell.value.toLowerCase() === 'online' ? 'status-online' : 'status-offline';
          return '<span class="status-badge ' + cls + '">' + escapeHtml(cell.value) + '</span>';
        }
        default:
          return escapeHtml(cell.value);
      }
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    window.addEventListener('message', function(event) {
      const msg = event.data;
      if (msg.type === 'loading') {
        statusEl.textContent = 'Loading…';
        tableEl.style.display = 'none';
        return;
      }
      if (msg.type === 'error') {
        statusEl.textContent = 'Error: ' + msg.message;
        tableEl.style.display = 'none';
        return;
      }
      if (msg.type === 'update') {
        const wasSaving = saveStatus && saveStatus.textContent === 'Saving…';
        activeFilterBy = msg.filterBy;
        activeFilterByMsg = msg.filterByMessage;
        statusEl.textContent = '';
        // Rebuild header
        theadRow.innerHTML = '';
        (msg.columns || []).forEach(function(col) {
          const th = document.createElement('th');
          th.textContent = col;
          theadRow.appendChild(th);
        });
        // Show filter bar and individual filter blocks
        activeFilterByTs = !!msg.filterByTs;
        const hasFilter = activeFilterBy !== undefined || activeFilterByMsg !== undefined || activeFilterByTs;
        filterBar.style.display = hasFilter ? 'block' : 'none';
        corrFilter.style.display = activeFilterBy !== undefined ? 'block' : 'none';
        msgFilter.style.display = activeFilterByMsg !== undefined ? 'block' : 'none';
        tsFilter.style.display = activeFilterByTs ? 'block' : 'none';
        // Rebuild rows
        tbodyEl.innerHTML = '';
        (msg.rows || []).forEach(function(row) {
          const tr = document.createElement('tr');
          tr.dataset.id = row.id;
          if (activeFilterBy !== undefined && row.cells[activeFilterBy]) {
            tr.dataset.filterValue = row.cells[activeFilterBy].value || '';
          }
          if (activeFilterByMsg !== undefined && row.cells[activeFilterByMsg]) {
            tr.dataset.msgValue = row.cells[activeFilterByMsg].value || '';
          }
          if (activeFilterByTs && row.meta && row.meta.ts) {
            tr.dataset.ts = row.meta.ts;
          }
          (row.cells || []).forEach(function(cell) {
            const td = document.createElement('td');
            td.innerHTML = encodeCell(cell);
            tr.appendChild(td);
          });
          tbodyEl.appendChild(tr);
        });
        tableEl.style.display = msg.rows && msg.rows.length > 0 ? '' : 'none';
        if (!msg.rows || msg.rows.length === 0) {
          statusEl.textContent = 'No items.';
        }
        applyFilters();
        // Inject edit controls
        activeAppId = msg.editConfig ? msg.editConfig.appId : undefined;
        saveBar.style.display = msg.editConfig ? 'flex' : 'none';
        if (msg.editConfig) {
          saveStatus.textContent = wasSaving ? 'Saved' : '';
          if (wasSaving) { setTimeout(function() { saveStatus.textContent = ''; }, 2000); }
          originalEditValues = {};
          msg.editConfig.fields.forEach(function(f) {
            originalEditValues[f.rowId] = f.currentValue;
            const tr = tbodyEl.querySelector('tr[data-id="' + f.rowId + '"]');
            if (!tr) { return; }
            const tds = tr.querySelectorAll('td');
            const td = tds[1];
            if (!td) { return; }
            if (f.inputKind === 'text') {
              td.innerHTML = '<input class="edit-input" data-field-id="' + f.rowId + '" type="text" value="' + escapeHtml(f.currentValue) + '" />';
            } else if (f.inputKind === 'boolean') {
              td.innerHTML = '<select class="edit-input" data-field-id="' + f.rowId + '">'
                + '<option value="true"' + (f.currentValue === 'true' ? ' selected' : '') + '>true</option>'
                + '<option value="false"' + (f.currentValue === 'false' ? ' selected' : '') + '>false</option>'
                + '</select>';
            } else if (f.inputKind === 'tags') {
              td.innerHTML = '<input class="edit-input" data-field-id="' + f.rowId + '" type="text" value="' + escapeHtml(f.currentValue) + '" placeholder="tag1, tag2, …" />';
            }
          });
          saveBtn.disabled = true;
        }
        // Render extra sections (e.g. connectors)
        extraSectionsEl.innerHTML = '';
        (msg.extraSections || []).forEach(function(section) {
          const wrapper = document.createElement('div');
          wrapper.className = 'extra-section';
          const titleEl = document.createElement('div');
          titleEl.className = 'extra-section-title';
          titleEl.textContent = section.title || '';
          wrapper.appendChild(titleEl);
          const table = document.createElement('table');
          const thead = document.createElement('thead');
          const theadTr = document.createElement('tr');
          (section.columns || []).forEach(function(col) {
            const th = document.createElement('th');
            th.textContent = col;
            theadTr.appendChild(th);
          });
          thead.appendChild(theadTr);
          table.appendChild(thead);
          const tbody = document.createElement('tbody');
          (section.rows || []).forEach(function(row) {
            const tr = document.createElement('tr');
            (row.cells || []).forEach(function(cell) {
              const td = document.createElement('td');
              td.innerHTML = encodeCell(cell);
              tr.appendChild(td);
            });
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          wrapper.appendChild(table);
          extraSectionsEl.appendChild(wrapper);
        });
        return;
      }
    });
  </script>
</body>
</html>`;
}
