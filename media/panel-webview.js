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
  const filterInputsEl = document.getElementById('filter-inputs');
  const tsFilter = document.getElementById('ts-filter');
  const tsFrom = document.getElementById('ts-from');
  const tsTo = document.getElementById('ts-to');
  const saveBar = document.getElementById('save-bar');
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  let activeAppId = undefined;
  let originalEditValues = {};

  // ── Edit support ────────────────────────────────────────────────────────────

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

  // ── Unified filter state ─────────────────────────────────────────────────────
  // activeFilters: Array<{ columnIndex: number; inputEl: HTMLInputElement }>
  let activeFilters = [];
  let activeFilterByTs = false;

  function applyFilters() {
    const fromMs = tsFrom && tsFrom.value ? new Date(tsFrom.value + 'Z').getTime() : null;
    const toMs = tsTo && tsTo.value ? new Date(tsTo.value + 'Z').getTime() : null;

    Array.from(tbodyEl.querySelectorAll('tr')).forEach(function (tr) {
      let visible = true;

      // Per-filter text matching (each filter has its own CI flag)
      activeFilters.forEach(function (f, i) {
        const raw = f.inputEl.value;
        if (!raw) { return; }
        const sensitive = f.ciRef();
        const query = sensitive ? raw : raw.toLowerCase();
        const cellRaw = tr.dataset['filter' + i] || '';
        const cellVal = sensitive ? cellRaw : cellRaw.toLowerCase();
        if (!cellVal.includes(query)) { visible = false; }
      });

      // Timestamp range
      if (activeFilterByTs && tr.dataset.ts) {
        const rowMs = new Date(tr.dataset.ts).getTime();
        if (fromMs !== null && rowMs < fromMs) { visible = false; }
        if (toMs !== null && rowMs > toMs) { visible = false; }
      }

      tr.style.display = visible ? '' : 'none';
    });
  }

  // Build filter inputs from filters descriptor array
  function buildFilterInputs(filters) {
    filterInputsEl.innerHTML = '';
    activeFilters = [];

    (filters || []).forEach(function (f, i) {
      const wrapper = document.createElement('div');
      const label = document.createElement('label');
      label.style.cssText = 'display:block; font-size:0.8em; opacity:0.6; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em;';
      label.textContent = f.label;

      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:6px;';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Filter by ' + f.label.toLowerCase() + '…';
      input.style.cssText = 'width:220px; padding:4px 8px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border,#555); border-radius:3px; font-size:inherit;';

      // Aa = match case toggle — off by default (case insensitive)
      let matchCase = false;
      const ciBtn = document.createElement('button');
      ciBtn.textContent = 'Aa';
      ciBtn.title = 'Match case';
      ciBtn.style.cssText = 'padding:3px 7px; font-size:0.8em; border-radius:3px; cursor:pointer; border:1px solid var(--vscode-input-border,#555); font-family:inherit; transition: opacity 0.1s;';
      function updateCiStyle() {
        ciBtn.style.background = matchCase
          ? 'var(--vscode-button-background)' : 'var(--vscode-input-background)';
        ciBtn.style.color = matchCase
          ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)';
        ciBtn.style.opacity = matchCase ? '1' : '0.5';
      }
      updateCiStyle();
      ciBtn.addEventListener('click', function () {
        matchCase = !matchCase;
        updateCiStyle();
        applyFilters();
      });

      input.addEventListener('input', function () {
        // Strip whitespace for correlation-id-style filters (first filter only by convention)
        if (i === 0 && filters.length > 1) {
          const cleaned = input.value.replace(/[ \t\r\n]+/g, '');
          if (cleaned !== input.value) { input.value = cleaned; }
        }
        applyFilters();
      });

      row.appendChild(input);
      row.appendChild(ciBtn);
      wrapper.appendChild(label);
      wrapper.appendChild(row);
      filterInputsEl.appendChild(wrapper);
      activeFilters.push({ columnIndex: f.columnIndex, inputEl: input, ciRef: function() { return matchCase; } });
    });
  }

  if (tsFrom) { tsFrom.addEventListener('input', applyFilters); }
  if (tsTo) { tsTo.addEventListener('input', applyFilters); }

  // ── Save (application edit) ──────────────────────────────────────────────────

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

  // ── HTML helpers ─────────────────────────────────────────────────────────────

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

  // ── Resizable columns ────────────────────────────────────────────────────────

  let colgroup = null;

  function buildColgroup(count) {
    if (colgroup) { colgroup.remove(); }
    colgroup = document.createElement('colgroup');
    for (let i = 0; i < count; i++) {
      colgroup.appendChild(document.createElement('col'));
    }
    tableEl.insertBefore(colgroup, tableEl.firstChild);
  }

  function attachResizeHandles(columns) {
    const ths = Array.from(theadRow.querySelectorAll('th'));
    ths.forEach(function (th, i) {
      const handle = document.createElement('div');
      handle.className = 'col-resize-handle';
      th.appendChild(handle);

      handle.addEventListener('mousedown', function (e) {
        e.preventDefault();
        handle.classList.add('dragging');
        const startX = e.clientX;
        const startWidth = th.offsetWidth;

        function onMove(e) {
          const col = colgroup && colgroup.querySelectorAll('col')[i];
          if (col) {
            col.style.width = Math.max(40, startWidth + e.clientX - startX) + 'px';
          }
        }
        function onUp() {
          handle.classList.remove('dragging');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }

  // ── Row click ────────────────────────────────────────────────────────────────

  tbodyEl.addEventListener('click', function (e) {
    const tr = e.target.closest('tr');
    if (!tr || !tr.dataset.clickable || !tr.dataset.id) { return; }
    vscode.postMessage({ type: 'itemClick', id: tr.dataset.id });
  });

  // ── Message handler ──────────────────────────────────────────────────────────

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

      // ── Header + colgroup ──
      theadRow.innerHTML = '';
      const columns = msg.columns || [];
      columns.forEach(function (col) {
        const th = document.createElement('th');
        th.textContent = col;
        theadRow.appendChild(th);
      });
      buildColgroup(columns.length);
      attachResizeHandles(columns);

      // ── Filters ──
      const filters = msg.filters || [];
      activeFilterByTs = !!msg.filterByTs;
      buildFilterInputs(filters);
      const hasFilter = filters.length > 0 || activeFilterByTs;
      filterBar.style.display = hasFilter ? 'block' : 'none';
      if (tsFilter) {
        tsFilter.style.display = activeFilterByTs ? 'block' : 'none';
      }

      // ── Rows ──
      statusEl.textContent = '';
      tbodyEl.innerHTML = '';
      (msg.rows || []).forEach(function (row) {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        if (row.meta && row.meta.clickable) {
          tr.dataset.clickable = '1';
        }
        // Attach filter data attributes for each active filter
        activeFilters.forEach(function (f, i) {
          if (row.cells[f.columnIndex]) {
            tr.dataset['filter' + i] = row.cells[f.columnIndex].value || '';
          }
        });
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

      // ── Edit config ──
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

      // ── Extra sections ──
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
