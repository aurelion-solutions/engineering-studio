// Webview script for Aurelion detail panels.
// Loaded as an external file so VS Code's CSP allows it via cspSource.
(function () {
  const vscode = acquireVsCodeApi();
  const statusEl = document.getElementById('status');

  // ── DAG state ────────────────────────────────────────────────────────────────
  let cy = null;
  const dagContainerEl = document.getElementById('dag-container');
  const dagGraphEl = document.getElementById('dag-graph');
  const dagArgsTitleEl = document.getElementById('dag-args-title');
  const dagArgsEl = document.getElementById('dag-args');
  const dagEmptyEl = document.getElementById('dag-empty');

  // First-render animation flag — per panel (each webview IIFE is a separate instance)
  var hasRenderedOnce = false;

  function renderDag(dag) {
    // Destroy previous instance
    if (cy) { cy.stop(); cy.destroy(); cy = null; }

    dagContainerEl.style.display = 'flex';

    if (!dag || !dag.elements || dag.elements.length === 0) {
      dagGraphEl.style.display = 'none';
      if (dagArgsTitleEl) { dagArgsTitleEl.style.display = 'none'; }
      dagArgsEl.style.display = 'none';
      dagEmptyEl.style.display = 'block';
      return;
    }

    dagGraphEl.style.display = '';
    if (dagArgsTitleEl) { dagArgsTitleEl.style.display = 'none'; }
    dagArgsEl.style.display = 'none';
    dagEmptyEl.style.display = 'none';

    // Warn on dangling requires (also forwarded to OutputChannel via postMessage)
    (dag.warnings || []).forEach(function (w) {
      console.warn('[aurelion-dag]', w);
      vscode.postMessage({ type: 'dagWarning', message: w });
    });


    // Cytoscape canvas style strings do NOT resolve CSS var() — resolve all values
    // once from the body's computed style, with safe fallbacks for missing themes.
    var bodyStyle = getComputedStyle(document.body);
    function cssVar(name, fallback) {
      var v = bodyStyle.getPropertyValue(name).trim();
      return v || fallback;
    }
    var fontFamily = cssVar('--vscode-font-family', 'sans-serif');
    var nodeBg = cssVar('--vscode-editor-inactiveSelectionBackground', '#3a3d41');
    var nodeBorder = cssVar('--vscode-focusBorder', '#007fd4');
    var nodeText = cssVar('--vscode-foreground', '#cccccc');
    var warnBorder = cssVar('--vscode-editorWarning-foreground', '#cca700');
    var errorBorder = cssVar('--vscode-errorForeground', '#f48771');
    var edgeColor = cssVar('--vscode-descriptionForeground', '#9d9d9d');
    var focusBorder = cssVar('--vscode-focusBorder', '#007fd4');
    // Status-specific colors
    var disabledFg = cssVar('--vscode-disabledForeground', '#888');
    var ansiBlue = cssVar('--vscode-terminal-ansiBlue', '#3794ff');
    var ansiGreen = cssVar('--vscode-terminal-ansiGreen', '#3fb950');
    var descFg = cssVar('--vscode-descriptionForeground', '#9d9d9d');

    var shouldAnimate = !hasRenderedOnce;

    cy = cytoscape({
      container: dagGraphEl,
      elements: dag.elements,
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'roundrectangle',
            'background-color': nodeBg,
            'border-color': nodeBorder,
            'border-width': 2,
            'color': nodeText,
            'label': 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': 200,
            'text-valign': 'center',
            'text-halign': 'center',
            'padding': 12,
            'width': 'label',
            'height': 'label',
            'font-size': 13,
            'font-family': fontFamily,
          },
        },
        {
          selector: 'node[kind="wait_for_event"]',
          style: { 'border-color': warnBorder },
        },
        {
          selector: 'node[kind="unknown"]',
          style: { 'border-color': errorBorder },
        },
        // ── Status selectors (override kind). NOTE: no spaces around `=` —
        // cytoscape's attribute selector parser rejects `[attr = "v"]` silently
        // and the rule never applies. Must be `[attr="v"]`.
        {
          selector: 'node[status="pending"]',
          style: { 'border-color': disabledFg, 'opacity': 0.65 },
        },
        {
          selector: 'node[status="running"]',
          style: { 'border-color': ansiBlue, 'border-width': 3 },
        },
        {
          selector: 'node[status="awaiting_event"]',
          style: { 'border-color': warnBorder, 'border-width': 2, 'border-style': 'dashed' },
        },
        {
          selector: 'node[status="completed"]',
          style: { 'border-color': ansiGreen, 'border-width': 2 },
        },
        {
          selector: 'node[status="failed"], node[status="failed_timeout"]',
          style: { 'border-color': errorBorder, 'border-width': 3 },
        },
        {
          selector: 'node[status="aborted"], node[status="cancelled"]',
          style: { 'border-color': descFg, 'border-style': 'dotted', 'border-width': 3, 'opacity': 0.7 },
        },
        // ── Hover class ───────────────────────────────────────────────────────
        {
          selector: 'node.hover',
          style: { 'border-width': 3, 'border-color': focusBorder },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle-backcurve',
            'arrow-scale': 1.2,
            'width': 2,
            'line-color': edgeColor,
            'target-arrow-color': edgeColor,
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        ranker: 'tight-tree',
        nodeSep: 40,
        rankSep: 80,
        fit: true,
        padding: 20,
        animate: shouldAnimate,
        animationDuration: shouldAnimate ? 200 : 0,
      },
    });

    // Flip first-render flag after layout starts
    hasRenderedOnce = true;

    // Force a fit pass after the first layout settles.
    cy.one('layoutstop', function () { cy.fit(undefined, 20); });

    // ── Hover cursor ──────────────────────────────────────────────────────────
    cy.on('mouseover', 'node', function () {
      dagGraphEl.style.cursor = 'pointer';
      cy.$(':selected').removeClass('hover');
    });
    cy.on('mouseover', 'node', function (evt) {
      evt.target.addClass('hover');
    });
    cy.on('mouseout', 'node', function (evt) {
      evt.target.removeClass('hover');
      dagGraphEl.style.cursor = '';
    });

    var argsByStep = dag.argsByStep || {};
    var isRunDag = dag.isRunDag || false;

    cy.on('tap', 'node', function (evt) {
      var stepName = evt.target.data('name');
      var stepId = (argsByStep[stepName] && argsByStep[stepName].step_id) || null;

      // Set title immediately
      if (dagArgsTitleEl) {
        dagArgsTitleEl.textContent = 'Args for: ' + stepName;
        dagArgsTitleEl.style.display = '';
      }

      if (isRunDag && stepId !== null) {
        // Run DAG with a real step_run record — lazy fetch full detail via host
        dagArgsEl.classList.remove('json-block');
        dagArgsEl.textContent = 'Loading...';
        dagArgsEl.style.display = '';
        vscode.postMessage({ type: 'dagNodeClick', stepName: stepName, stepId: stepId });
      } else {
        // Either a definition DAG (static args) or a run DAG orphan node
        // (step never executed — show the sentinel which includes planned
        // `definition_args` so the user sees what was scheduled).
        renderDagArgsValue(argsByStep[stepName]);
        dagArgsEl.style.display = '';
        vscode.postMessage({ type: 'dagNodeClick', stepName: stepName, stepId: stepId });
      }
    });
  }
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
  const tabBarEl = document.getElementById('tab-bar');
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

  // Syntax-highlight a pre-stringified JSON value. Input is a plain string;
  // output is HTML-safe (all literals are HTML-escaped before wrapping in spans).
  function formatJsonColored(jsonStr) {
    if (jsonStr === null || jsonStr === undefined) { return ''; }
    var s = String(jsonStr)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Match: strings (incl. escapes), numbers, booleans, null, and brackets/colons.
    var re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g;
    return s.replace(re, function (match, str, colon, bool, num, punct) {
      if (str) {
        var cls = colon ? 'json-key' : 'json-string';
        return '<span class="' + cls + '">' + str + '</span>' + (colon || '');
      }
      if (bool) { return '<span class="json-bool">' + bool + '</span>'; }
      if (num) { return '<span class="json-number">' + num + '</span>'; }
      if (punct) { return '<span class="json-punctuation">' + punct + '</span>'; }
      if (match === 'null') { return '<span class="json-null">null</span>'; }
      return match;
    });
  }

  // Render a value (any JSON-serializable) into the dag args panel with coloring.
  // Unwrapping rules — surface only the step's args, not the surrounding
  // metadata (status, attempt, started_at, ...):
  //   - sentinel from run-DAG orphan: { definition_args, status, ... }  → take definition_args
  //   - lazy-fetched step detail: { args, result, error, ... }          → take args
  //   - definition-DAG static args: a plain object/scalar               → show as-is
  function renderDagArgsValue(value) {
    var unwrapped = value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('definition_args' in value) {
        unwrapped = value.definition_args;
      } else if ('args' in value && 'status' in value) {
        unwrapped = value.args;
      }
    }
    var raw;
    try {
      raw = JSON.stringify(unwrapped, null, 2);
    } catch (_e) {
      dagArgsEl.textContent = '<unserializable>';
      dagArgsEl.classList.remove('json-block');
      return;
    }
    if (raw === undefined || raw === 'null') {
      dagArgsEl.classList.remove('json-block');
      dagArgsEl.textContent = '(no args)';
      return;
    }
    dagArgsEl.classList.add('json-block');
    dagArgsEl.innerHTML = formatJsonColored(raw);
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
      case 'json': {
        if (!cell.value) { return ''; }
        return '<pre class="json-block">' + formatJsonColored(cell.value) + '</pre>';
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

  // section.meta.routingKey is the routing key — title is display-only
  extraSectionsEl.addEventListener('click', function (e) {
    const tr = e.target.closest('tr');
    if (!tr || !tr.dataset.clickable || !tr.dataset.id || !tr.dataset.routingKey) { return; }
    vscode.postMessage({ type: 'stepClick', section: tr.dataset.routingKey, id: tr.dataset.id });
  });

  // ── Message handler ──────────────────────────────────────────────────────────

  window.addEventListener('message', function (event) {
    const msg = event.data;

    if (msg.type === 'set-tabs') {
      if (!tabBarEl) { return; }
      tabBarEl.innerHTML = '';
      var tabs = msg.tabs || [];
      var activeTab = msg.activeTab;
      var counts = msg.counts || {};
      tabs.forEach(function (tab) {
        var btn = document.createElement('button');
        btn.className = 'tab' + (tab.key === activeTab ? ' active' : '');
        btn.dataset.tab = tab.key;
        var count = counts[tab.key];
        var countStr = (count !== undefined && count !== null) ? ' (' + count + ')' : '';
        var span = document.createElement('span');
        span.className = 'tab-count';
        span.textContent = countStr;
        btn.textContent = tab.label;
        btn.appendChild(span);
        btn.addEventListener('click', function () {
          vscode.postMessage({ type: 'switch-tab', tab: btn.dataset.tab });
        });
        tabBarEl.appendChild(btn);
      });
      tabBarEl.style.display = 'flex';
      return;
    }

    if (msg.type === 'clear-tabs') {
      if (!tabBarEl) { return; }
      tabBarEl.style.display = 'none';
      tabBarEl.innerHTML = '';
      return;
    }

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

    // ── Lazy DAG node detail (run-DAG click response) ──────────────────────────
    if (msg.type === 'dagNodeDetail') {
      if (dagArgsTitleEl) {
        dagArgsTitleEl.textContent = 'Args for: ' + (msg.stepName || '');
        dagArgsTitleEl.style.display = '';
      }
      if (msg.error) {
        dagArgsEl.classList.remove('json-block');
        dagArgsEl.textContent = 'Error: ' + msg.error;
      } else {
        renderDagArgsValue(msg.detail);
      }
      dagArgsEl.style.display = '';
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
        // Synthetic trailing <td> for action buttons — only appended when actions exist
        // so tbody rows always have exactly cells.length <td>, matching thead/colgroup (Section 11.1)
        if (row.actions && row.actions.length > 0) {
          const actionTd = document.createElement('td');
          actionTd.style.cssText = 'white-space:nowrap; padding:2px 4px;';
          const actionWrap = document.createElement('span');
          actionWrap.style.cssText = 'display:inline-flex; gap:4px;';
          row.actions.forEach(function (action) {
            const btn = document.createElement('button');
            btn.textContent = action.label;
            btn.dataset.verb = action.verb;
            btn.dataset.runId = row.id;
            btn.setAttribute('aria-label', action.label + ' run ' + row.id);
            btn.style.cssText = 'padding:2px 8px; font-size:0.8em; cursor:pointer; border-radius:3px; border:1px solid var(--vscode-input-border,#555); background:var(--vscode-input-background); color:var(--vscode-foreground); font-family:inherit;';
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              btn.disabled = true;
              vscode.postMessage({ type: 'pipelineAction', verb: action.verb, runId: row.id });
            });
            actionWrap.appendChild(btn);
          });
          actionTd.appendChild(actionWrap);
          tr.appendChild(actionTd);
        }
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

      // ── DAG ──
      if (msg.dag) {
        // Tag the descriptor to tell the tap handler which mode to use
        var dagWithFlag = Object.assign({}, msg.dag, { isRunDag: !!msg.dagIsRunDag });
        renderDag(dagWithFlag);
      } else if (dagContainerEl) {
        // No DAG for this panel kind — hide container
        if (cy) { cy.stop(); cy.destroy(); cy = null; }
        dagContainerEl.style.display = 'none';
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
        const sectionClickable = section.meta && section.meta.clickable === '1';
        const sectionRoutingKey = (section.meta && section.meta.routingKey) || '';
        (section.rows || []).forEach(function (row) {
          const tr = document.createElement('tr');
          if (sectionClickable && row.id && row.id !== 'no-steps') {
            tr.dataset.id = row.id;
            tr.dataset.clickable = '1';
            tr.dataset.routingKey = sectionRoutingKey;
          }
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
