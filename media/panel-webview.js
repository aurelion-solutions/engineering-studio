// Webview script for Aurelion detail panels.
// Loaded as an external file so VS Code's CSP allows it via cspSource.
(function () {
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
    inputs.forEach(function (el) {
      if (originalEditValues[el.dataset.fieldId] !== el.value) { dirty = true; }
    });
    saveBtn.disabled = !dirty;
  }

  tbodyEl.addEventListener('input', function (e) {
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
    Array.from(tbodyEl.querySelectorAll('tr')).forEach(function (tr) {
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

  saveBtn.addEventListener('click', function () {
    if (!activeAppId) { return; }
    const inputs = tbodyEl.querySelectorAll('.edit-input');
    const payload = {};
    inputs.forEach(function (el) {
      const fid = el.dataset.fieldId;
      if (fid === 'kv-name') { payload.name = el.value.trim(); }
      if (fid === 'kv-is_active') { payload.is_active = el.value === 'true'; }
      if (fid === 'kv-required_tags') {
        payload.required_connector_tags = el.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      }
    });
    saveStatus.textContent = 'Saving…';
    vscode.postMessage({ type: 'patch', appId: activeAppId, payload: payload });
  });

  filterInput.addEventListener('input', function () {
    const cleaned = filterInput.value.replace(/[ \t\r\n]+/g, '');
    if (cleaned !== filterInput.value) { filterInput.value = cleaned; }
    applyFilters();
  });
  filterMsg.addEventListener('input', applyFilters);
  tsFrom.addEventListener('input', applyFilters);
  tsTo.addEventListener('input', applyFilters);

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

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
        const positiveStatuses = ['online', 'active', 'connected', 'ok', 'success'];
        const cls = positiveStatuses.includes(cell.value.toLowerCase()) ? 'status-online' : 'status-offline';
        return '<span class="status-badge ' + cls + '">' + escapeHtml(cell.value) + '</span>';
      }
      default:
        return escapeHtml(cell.value);
    }
  }

  tbodyEl.addEventListener('click', function (e) {
    const tr = e.target.closest('tr');
    if (!tr || !tr.dataset.clickable || !tr.dataset.id) { return; }
    vscode.postMessage({ type: 'itemClick', id: tr.dataset.id });
  });

  window.addEventListener('message', function (event) {
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
      theadRow.innerHTML = '';
      (msg.columns || []).forEach(function (col) {
        const th = document.createElement('th');
        th.textContent = col;
        theadRow.appendChild(th);
      });
      activeFilterByTs = !!msg.filterByTs;
      const hasFilter = activeFilterBy !== undefined || activeFilterByMsg !== undefined || activeFilterByTs;
      filterBar.style.display = hasFilter ? 'block' : 'none';
      corrFilter.style.display = activeFilterBy !== undefined ? 'block' : 'none';
      msgFilter.style.display = activeFilterByMsg !== undefined ? 'block' : 'none';
      tsFilter.style.display = activeFilterByTs ? 'block' : 'none';
      tbodyEl.innerHTML = '';
      (msg.rows || []).forEach(function (row) {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        if (row.meta && row.meta.clickable) {
          tr.dataset.clickable = '1';
        }
        if (activeFilterBy !== undefined && row.cells[activeFilterBy]) {
          tr.dataset.filterValue = row.cells[activeFilterBy].value || '';
        }
        if (activeFilterByMsg !== undefined && row.cells[activeFilterByMsg]) {
          tr.dataset.msgValue = row.cells[activeFilterByMsg].value || '';
        }
        if (activeFilterByTs && row.meta && row.meta.ts) {
          tr.dataset.ts = row.meta.ts;
        }
        (row.cells || []).forEach(function (cell) {
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
      activeAppId = msg.editConfig ? msg.editConfig.appId : undefined;
      saveBar.style.display = msg.editConfig ? 'flex' : 'none';
      if (msg.editConfig) {
        saveStatus.textContent = wasSaving ? 'Saved' : '';
        if (wasSaving) { setTimeout(function () { saveStatus.textContent = ''; }, 2000); }
        originalEditValues = {};
        msg.editConfig.fields.forEach(function (f) {
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
      extraSectionsEl.innerHTML = '';
      (msg.extraSections || []).forEach(function (section) {
        const wrapper = document.createElement('div');
        wrapper.className = 'extra-section';
        const titleEl = document.createElement('div');
        titleEl.className = 'extra-section-title';
        titleEl.textContent = section.title || '';
        wrapper.appendChild(titleEl);
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const theadTr = document.createElement('tr');
        (section.columns || []).forEach(function (col) {
          const th = document.createElement('th');
          th.textContent = col;
          theadTr.appendChild(th);
        });
        thead.appendChild(theadTr);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        (section.rows || []).forEach(function (row) {
          const tr = document.createElement('tr');
          (row.cells || []).forEach(function (cell) {
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
    }
  });
}());
