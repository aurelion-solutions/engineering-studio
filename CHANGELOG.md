# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.9.0] - 2026-05-13

### Changed

- **Application shown by full name in all diff panels.** All six tabs across Access State and Account State now display `application_name` (e.g. "GitHub Enterprise") instead of the short code ("GHE"). Falls back to `application_code` when `application_name` is null.
  - **Column order** — Application column moved to position 0 (leftmost) in every tab where it appears:
    - Access State List: **Application** · Subject · Account · Resource · Action · Effect · Active
    - Access State Incoming: **Application** · Op · Subject · Target · Change · Time
    - Access State Outgoing: **Application** · Kind · Status · Subject · Target · Change · Time
    - Account State List: **Application** · Username · Status · MFA · Privileged · Subject · Updated
    - Account State Incoming: **Application** · Op · Account/Target · Change · Time
    - Account State Outgoing: **Application** · Kind · Status · Subject · Target · Change · Time
  - `api/types.ts`: `AccessFactFromApi`, `DeltaItemFromApi`, `PlanItemFromApi` gain `application_name: string | null`.
  - `inventoryCategories.ts`: `richHeaders` + `buildRichRow` builders updated for all six tabs.
  - `accessStateListRenderer.ts`, `accountStateListRenderer.ts`: fallback column headers updated to match.

### Added

- **Accounts — multi-tab diff view (List / Incoming / Outgoing).** Replaced the flat "Accounts" inventory node with an `accountState` multi-tab panel mirroring the Access State pattern.
  - **List** tab: Username · Application · Status (badge: active/suspended/disabled/invited) · MFA (●/○) · Privileged (●/○) · Subject (display or short UUID + tooltip) · Updated. Fetches `GET /api/v0/accounts`.
  - **Incoming** tab: Op (glyph + CSS class) · Account/Target (`account_display` → short UUID + tooltip) · Change (`change_summary`) · App · Time. Fetches `GET /api/v0/inventory-reconciles/delta-items?entity_type=account&status=pending`.
  - **Outgoing** tab: Kind (abbreviated: `account_create` → `+account`, `account_invite` → `+invite`, `account_activate` → `↻activate`, `account_suspend` → `⏸suspend`, `account_disable` → `⊘account`) · Status (exec CSS class) · Subject · Target · Change · App · Time. Fetches `GET /api/v0/plans/items?kind=account_create,account_invite,account_activate,account_suspend,account_disable&execution_status=proposed,executing&plan_status=active`.
  - Tree node badge shows `"N diff"` count (account incoming + outgoing) via `fetchAccountStateDiffCount()`.
  - `abbreviateKind` in `inventoryCategories.ts` extended with `account_invite`, `account_activate`, `account_suspend` entries.
  - New API fetchers: `fetchAccountsForState`, `fetchAccountIncomingDeltaItems`, `fetchAccountOutgoingPlanItems`, `fetchAccountStateDiffCount`.
  - New renderer: `accountStateListRenderer.ts` (`buildAccountStateRows`, `buildAccountStateRichRows`, `accountStateColumns`, `ACCOUNT_STATE_TABS`).
  - `PanelContentKind` + `PanelOpenArgs` extended with `accountState` variant; `AccountStateTabKey` type added.
  - `guards.ts` — `case "accountState"` added to `isOpenDetailPanelArg`.
  - `DetailPanelController` — `case "accountState"` in `_fetchAndBuild`; `switch-tab` handler generalised for both `accessState` and `accountState`; `clear-tabs` condition updated.
  - 548/549 tests pass (1 skipped, 0 fail). `tsc` + lint clean.

### Changed

- **Access State panel — new display columns (Op · Subject · Target · Change · App · Time scheme).**
  - **Incoming** tab: Op (glyph + operation, coloured by CSS class), Subject (`subject_display` → `account_display` → `short(UUID)`), Target (`resource_display` → short UUID), Change (`change_summary`), App (`application_code`), Time (HH:mm:ss today / MM-DD HH:mm older).
  - **Outgoing** tab: Kind (abbreviated: `account_disable` → `⊘account`, `grant_role` → `+role`, etc. + tooltip with full kind), Status (`execution_status` with CSS class), Subject (`subject_display` → short UUID), Target (`target_display`), Change (`change_summary`), App (`application_code`), Time.
  - **List** tab: Subject (`subject_display` → short UUID), Account (`account_display` → short UUID), Resource (`resource_display` → short UUID), Action (`action_slug`), Effect (badge `allow`/`deny`), App (`application_code`), Active (● / ○).
  - Short UUIDs carry full-UUID tooltip; Op/Status cells carry `cssClass` metadata; Effect cell carries `badge-effect-allow` / `badge-effect-deny` class.
- **`api/types.ts`** — added display fields to three types:
  - `DeltaItemFromApi`: `subject_display`, `account_display`, `resource_display`, `application_code`, `change_summary`, `reconciliation_run_id` (all `string | null`).
  - `PlanItemFromApi`: `subject_ref`, `subject_type`, `subject_display`, `target_display`, `application_code`, `change_summary`.
  - `AccessFactFromApi`: `action_slug`, `is_active`, `subject_display`, `account_display`, `resource_display`, `application_code`.
- **`inventoryCategories.ts`** — `AccessStateTab` gains `richHeaders: string[]` and `buildRichRow: AccessStateRichRowBuilder`; `RichCell` type exported (`{ text, cssClass?, tooltip? }`). Three tab definitions updated with O(1) formatters for time, op glyph, kind abbreviation, effect badge.
- **`accessStateListRenderer.ts`** — `accessStateColumns()` now reads `richHeaders` from tab definition; `buildAccessStateRows()` delegates to `buildRichRow` and encodes `cssClass`/`tooltip` as JSON in `cell.extra`; new `buildAccessStateRichRows()` export returns `RichCell[]` directly; `richCellToPanelCell()` helper exported.
- **`panelHtml.ts`** — 12 new CSS classes: `.op-create`, `.op-revoke`, `.op-update`, `.op-reactivate`, `.op-noop`, `.exec-proposed`, `.exec-executing`, `.exec-done`, `.exec-failed`, `.badge-effect-allow`, `.badge-effect-deny`, `.uuid-short`.
- Tests updated: `accessStateListRenderer.test.ts` rewritten (500 total tests, 499 pass, 0 fail).

### Added

- **Access State tab-bar UI** — `#tab-bar` element added to the detail panel webview (List / Incoming / Outgoing buttons with `(N)` count badges). Clicking a tab posts `switch-tab` message; controller updates `activeTab`, re-fetches table data, and sends `set-tabs` (with updated `activeTab`) + `update`. Panel title updates to reflect the active tab. `clear-tabs` is sent when the panel is reused for a non-accessState kind. Counts fetched in parallel with table data via `fetchAccessStateDiffCount`.
- **Access State panel** — merged "Access Artifacts" and "Access Facts" tree nodes into a single "Access State" node with three tabs: List (access facts), Incoming (pending reconciliation delta items), Outgoing (proposed/executing plan items).
- Three new API fetchers in `platformClient.ts`: `fetchAccessFactsForState`, `fetchIncomingDeltaItems` (GET `/api/v0/inventory-reconciles/delta-items`), `fetchOutgoingPlanItems` (GET `/api/v0/plans/items`).
- `fetchAccessStateDiffCount()` — calls both count endpoints in parallel and returns `{ incoming, outgoing, total }`.
- Access State badge on the Inventory tree node: shows `"N diff"` description when total > 0; refreshes on `aurelion.refreshInventory`; non-blocking (badge loads after tree render).
- New renderer `accessStateListRenderer.ts` with `buildAccessStateRows(tab, data)` and `accessStateColumns(tab)` for all three tabs.
- New types in `api/types.ts`: `DeltaItemFromApi`, `DeltaItemsResponseFromApi`, `DeltaItemCountFromApi`, `PlanItemFromApi`, `PlanItemsResponseFromApi`, `PlanItemCountFromApi`, `AccessStateDiffCount`.
- `PanelContentKind` and `PanelOpenArgs` extended with `"accessState"` variant (`{ kind, ctxKey, activeTab }`).
- 14 new tests: `inventoryCategories.test.ts` (updated for 14 categories + Access State tab assertions), `accessStateListRenderer.test.ts` (11 new tests covering all three tabs).

### Removed

- Inventory tree nodes "Access Artifacts" (key `accessArtifacts`) and "Access Facts" (key `accessFacts`) replaced by unified "Access State" node.

### Fixed

- Cytoscape attribute selectors: removed spaces around `=` (`node[status="..."]`) — status colours were never applied since the DAG landed
- Orphan step nodes (cancelled before start) now inherit run status via `inheritStatusFromRun`; `definition_args` propagated on sentinel for local render without extra round-trip
- DAG controller: removed `stepId === null` guard branch; orphan args rendered entirely in webview

### Changed

- Engineering Studio: run-detail panel gains DAG with per-step status colouring; args/result panel moved below graph; cosmetic pass on node/edge styling.
- DAG args panel repositioned below graph at full width (`#dag-container` flex-direction: column); new `#dag-args-title` element shows "Args for: <step name>" above JSON.
- Cytoscape graph cosmetics: nodes padding 12, font-size 13, text-max-width 200, baseline border-width 2; edges 2px wide with `triangle-backcurve` arrowhead; hover cursor + `.hover` class via mouseover/mouseout. Dagre layout switched to `ranker: tight-tree`, nodeSep 40, rankSep 80. First-render animates 200ms; polling refreshes skip animation.

### Added

- JSON syntax highlighting in detail panels: new `"json"` `PanelCell` kind renders args/result via `formatJsonColored` (keys/strings/numbers/booleans/null coloured via VS Code theme vars). Applied to DAG args panel (definition + run) and `pipelineStepDetail` args/result rows.
- Pipeline run-detail panel now shows a DAG with per-step `StepRunStatus` colouring (pending/running/awaiting_event/completed/failed/failed_timeout/aborted/cancelled) via VS Code theme vars. Topology fetched from pipeline definition in parallel with run detail (`Promise.all`); drift between run and current definition reported as warnings to Output Channel.
- Lazy step-detail fetch on DAG node click: webview posts `dagNodeClick` with `stepId`; controller calls `fetchStepDetail` and replies with `dagNodeDetail`; args panel shows "Loading…" while fetch is in flight.
- `fetchStepDetail(runId, stepId)` in platform client — `GET /api/v0/pipeline-runs/{run_id}/steps/{step_id}`.
- `buildPipelineRunDag(run, definition)` pure builder in `pipelineRunDetailRenderer.ts`; `pipelineDagShared.ts` shared module with `DagDescriptor`, `DagNodeData`, `DagNodeKind`, `classifyStep`, `buildNodeLabel`.
- DAG warnings forwarded from webview to `extensionChannel` via `dagWarning` postMessage.
- Pipeline definition detail panel: Steps table replaced with interactive cytoscape DAG (click node → args JSON in side pane). Vendored `cytoscape`, `dagre`, and `cytoscape-dagre` UMD bundles in `media/`. Theme colors resolved via `getComputedStyle` (cytoscape canvas does not parse CSS `var()`).

- Pipeline definitions drill-down (Step 25c-2c): click the Definitions TreeView node to list all loaded pipeline definitions; click a row to open a per-definition detail panel with Triggers and Steps sections.
- `fetchPipelineDetail(name)` GET fetcher in platform client; `encodeURIComponent` on path segment; reuses `_extractErrorDetail`.
- `PipelineDetailFromApi` type added to `api/types.ts`; `PipelineTriggerSpecFromApi` and `PipelineSummaryFromApi` realigned to kernel `orchestrator/schemas.py` (removed phantom `trigger`/`steps:string[]`/`kind`/`event_type`/`predicate` fields; added `type`, `routing_key`, `cron`, `every`, `match`, `args`, `schema_version`, `step_count`, `triggers[]`).
- Two new pure renderers: `pipelineDefinitionsListRenderer.ts` (list with trigger summary logic) and `pipelineDefinitionDetailRenderer.ts` (header KV + Triggers section + Steps section with `wait_for_event` badge discriminator and `<unknown step kind>` fallback).
- `PanelContentKind` extended with `"pipelineDefinitions"` and `"pipelineDefinitionDetail"`; `PanelOpenArgs` extended with matching shapes.
- `DetailPanelController`: two new `case` branches in `_titleForArgs`, `_refreshSecsForArgs` (null — frozen at kernel startup), `_fetchAndBuild`; `itemClick` arm routes `section === "definitions"` → `pipelineDefinitionDetail`.
- `PipelineDefinitionsNode` in `tree.ts` now carries `command: aurelion.openDetailPanel` with `{ kind: "pipelineDefinitions", ctxKey: "pipeline-definitions" }` args; `contextValue` unchanged.
- `isOpenDetailPanelArg` guard extended with `pipelineDefinitions` and `pipelineDefinitionDetail` cases.
- 40 new tests: list renderer (11), detail renderer (17), `fetchPipelineDetail` HTTP (5), tree regression patch (`definitions_node_has_open_definitions_command`, guard check for defs node).

- Trigger pipeline run form on the Definitions node (raw JSON args, server-side validation only). Right-click Definitions → "Aurelion: Trigger pipeline run..." opens a single-instance webview with a pipeline-name dropdown and a raw JSON args editor; on 2xx the form closes and the tree refreshes; 422 detail rendered inline.

- Live schema merge from `/.well-known/pipeline-schema.json` with offline fallback; `liveSchemaFetcher`, `liveSchemaCache`, `yamlSchemaContributor` modules; `fetchPipelineSchema` in platform client; auto-refresh on activate and `apiBaseUrl` change

- Bundled pipeline YAML schema for offline autocomplete and structural validation via `contributes.yamlValidation`
- `redhat.vscode-yaml` declared as an extension dependency for zero-config YAML support
- Drift guard test: bundled schema validated against kernel source; manifest `yamlValidation` and `extensionDependencies` assertions

- Step-detail panel: read-only drill-down from run-detail Steps section. Click a step row to open (Step 25c-2b).
- `fetchPipelineStepDetail(runId, stepName)` GET fetcher in platform client; reuses `_extractErrorDetail`.
- `StepRunDetailFromApi` type in `api/types.ts` (extends `StepRunSummaryFromApi` with `args` and `result`).
- `PanelContentKind` extended with `"pipelineStepDetail"`; `PanelOpenArgs` extended with `pipelineStepDetail` shape.
- `Section.meta` optional field `{ clickable?: "1"; routingKey?: string }` for per-section click routing.
- New pure renderer `panels/renderers/pipelineStepDetailRenderer.ts` — no vscode import; exports `pipelineStepDetailHeaderColumns`, `buildPipelineStepDetailHeaderRows` (9 fields in spec order).
- `buildPipelineRunDetailStepsSection` now sets `id: s.step_name` (was `s.id`) and `meta: { clickable: "1", routingKey: "steps" }` on the section.
- `DetailPanelController`: `stepClick` message arm routes to `pipelineStepDetail`; `pipelineStepDetail` arm in `_fetchAndBuild`, `_titleForArgs`, `_refreshSecsForArgs` (null — no polling).
- Delegated click handler on `extraSectionsEl` in `panel-webview.js`; row-level `data-clickable`/`data-id`/`data-routingKey` set opt-in via `section.meta.clickable`; placeholder `"no-steps"` rows excluded.
- CSS hover affordance extended to `.extra-section tr[data-clickable]`.
- `isOpenDetailPanelArg` guard extended with `pipelineRunDetail` and `pipelineStepDetail` cases (and `itemDetail`).
- 18 new tests: `pipelineStepDetailRenderer` (9 cases incl. `no_vscode_import`), `fetchPipelineStepDetail` HTTP behaviour (6 cases), `steps_section_has_clickable_meta` + updated `steps_section_one_row_per_step_in_order`, 2 guard cases.

- Pipelines view: clicking a runs-list row now drills down to a read-only run-detail panel (Step 25c-2a).
- `fetchPipelineRunDetail(runId)` GET fetcher in platform client; `_extractErrorDetail` reused.
- `StepRunStatus` union (8 values: pending, running, awaiting_event, completed, failed, failed_timeout, aborted, cancelled) and `StepRunSummaryFromApi` + `PipelineRunDetailFromApi` types in `api/types.ts`.
- `PanelContentKind` extended with `"pipelineRunDetail"`; `PanelOpenArgs` extended with `pipelineRunDetail` shape.
- New pure renderer `panels/renderers/pipelineRunDetailRenderer.ts` — no vscode import, exports `pipelineRunDetailHeaderColumns`, `buildPipelineRunDetailHeaderRows`, `pipelineRunDetailStepsColumns`, `buildPipelineRunDetailStepsSection`, `TERMINAL_RUN_STATUSES`.
- `meta: { clickable: "1" }` on every row from `buildPipelineRunsRows` — enables webview row-click routing.
- `DetailPanelController`: `pipelineRuns` case now caches fetched runs in `_itemCache`; new `pipelineRunDetail` case in `_fetchAndBuild`; `itemClick` arm extended with `pipelineRuns` branch; `_titleForArgs` + `_refreshSecsForArgs` extended; terminal-run polling auto-cancelled via `TERMINAL_RUN_STATUSES`.
- 17 new tests: `pipelineRunDetailRenderer` (15 cases incl. `no_vscode_import`), `fetchPipelineRunDetail` HTTP behaviour (3 cases), `every_row_has_clickable_meta` in runs-list renderer.

- Pipelines view: cancel and retry pipeline runs from the runs-list panel rows.
- `cancelPipelineRun(runId)` and `retryPipelineRun(runId)` POST fetchers in platform client; 4xx `detail` field surfaced in thrown Error.
- `PanelRowAction` type and `actions?: PanelRowAction[]` field on `PanelRow` (backward-compatible).
- `actionsForRunStatus(status)` pure function in `pipelineRunsListRenderer.ts` — cancel for pending/running/awaiting_event; retry for completed/failed/failed_timeout/cancelled; empty for cancelling.
- `pipelineActionDispatch.ts` — pure injectable dispatch helper (confirm modal mandatory, no optimistic UI).
- Confirmation modal via `vscode.window.showWarningMessage` before every cancel/retry action.
- `pipelineAction` message arm in `DetailPanelController.onDidReceiveMessage`.
- Action buttons in panel webview rows; buttons disabled until next `update` arrives.
- Commands `aurelion.cancelPipelineRun` and `aurelion.retryPipelineRun` registered and hidden from command palette.
- `CancelPipelineRunResponseFromApi` and `RetryPipelineRunResponseFromApi` API types.
- 16 new tests: `actionsForRunStatus` (8 statuses), `dispatchPipelineAction` (4 cases), `cancelPipelineRun`/`retryPipelineRun` HTTP behaviour (4 cases).

- `pipelinesView` sidebar view with 8-node status skeleton (7 statuses + Definitions); no network, no webviews.
- New command `aurelion.refreshPipelines`.
- New slice `integrations/pipelines/` with pure-logic `pipelineStatusDefs.ts` + `PipelinesTreeDataProvider`.
- Pipelines view: clicking a status node now opens a live runs list with polling (`eventsRefreshSeconds`).
- `fetchPipelineRuns({ status, limit })` platform client function (GET `/api/v0/pipeline-runs?status=`).
- `PipelineRunStatus` and `PipelineRunSummaryFromApi` API types.
- New renderer `panels/renderers/pipelineRunsListRenderer.ts` — pure, no vscode dep.
- `PanelContentKind` extended with `"pipelineRuns"` variant; `PanelOpenArgs` extended with `pipelineRuns` shape.
- `isOpenDetailPanelArg` guard extended with `pipelineRuns` case.
- `pipelinesProvider.refresh()` added to the `apiBaseUrl` config-change branch.

### Removed

- `event_type` field from `LogBufferEvent` and `PlatformLogEntry` TypeScript types — mirrors kernel wire contract removal (Phase 17 Step 4).
- `event_type` parameter from `buildSyntheticLogEvent` — synthetic id is now `synthetic:<timestamp>` (was `synthetic:<event_type>:<timestamp>`).
- Connector-command display-title path on line1 of `formatLogLine` — `connector.command.*` log lines now render with `message` only (cosmetic regression: the humanized title, e.g. "Command received · sync accounts", is no longer shown since `event_type` is gone from the wire).

## [0.2.3] - 2026-04-27

### Added

- Phase 15 Data Lake Migration complete (20/20 milestones)
- `LakeViewProvider` tree view backed by `GET /api/v0/lake/status` with per-table snapshot metadata
- `aurelion.engineeringStudio.lakeView` sidebar view with `<namespace>.<name>`, snapshot id, count, and timestamp nodes
- Recent lake batches section: `LakeSectionHeaderNode` + `LakeBatchNode` items with per-section error isolation
- `fetchLakeStatus()` and `fetchLakeBatches()` platform client functions
- `LakeTableStatusFromApi`, `LakeStatusFromApi`, `LakeBatchFromApi`, `LakeBatchListResponseFromApi` API types
- `aurelion.refreshLake` command with view-title refresh button and config-change listener
- `integrations/lake/lakeNodes.ts` — pure node builders (`buildLakeTableNodes`, `buildLakeBatchNodes`, `buildLakeSectionHeader`, `buildLakeErrorNode`)
- 13 new tests: pure node builders + provider (tables + batches sections, concurrent-refresh guard)

## [0.2.2] - 2026-04-26

### Notes

- Phase 14 Step 9 — kernel now exposes `/api/v0/llm/execution-profiles` (GET/POST/PATCH/DELETE); Studio LLM profiles UI deferred to Step 13

### Added

- Phase 14 LLM Platform Layer complete (13/13 milestones)
- LLM Inference panel — execution profile selector (dropdown populated from kernel), prompt textarea, Run / Stream / Abort buttons, progressive token rendering for streaming mode, footer with `model · tokens_used · latency_ms · ttft_ms`
- `InferencePanelController` — single-instance `WebviewPanel` (ViewColumn.Beside), `openOrReveal()` / `_cancelInflight()` / `notifyApiBaseChanged()` / `dispose()`
- `LlmInferenceTreeDataProvider` — one-node tree view with `$(zap)` icon and click-to-open command
- `inferencePanelHtml.ts` — pure renderer for the inference panel HTML skeleton (CSP `connect-src 'none'`)
- `media/inference-webview.js` — vanilla client-side JS: `acquireVsCodeApi()`, profile dropdown, run/stream/abort click handlers, progressive token append, footer update
- `src/api/sseParser.ts` — pure SSE parser (`parseSseStream` async generator, `TextDecoder` streaming, `onParseError` callback, `AbortSignal` support)
- `runInference` and `streamInference` client functions in `platformClient.ts`
- `LLMInferenceRequest`, `LLMInferenceResponse`, `LLMInferenceStreamChunk` API types
- `aurelion.openInferencePanel` command
- `aurelion.engineeringStudio.llmInferenceView` sidebar view with welcome entry
- 11 new tests: SSE parser (5), platformClient inference (4), tree provider (2), InferencePanelController (4)

- LLM Models tree view with sparkle/circle-slash icons and provider badge
- Read-only detail panel showing model fields and associated execution profiles
- `LlmModelsTreeDataProvider` with error-safe refresh on config change
- `llmModelRenderer` pure renderer with no vscode dependency
- `aurelion.refreshLlmModels` and `aurelion.focusLlmModelsView` commands
- `LLMProvider`, `LLMModelFromApi`, `LLMExecutionProfileFromApi` API types
- `fetchLlmModels` and `fetchLlmExecutionProfiles` platform client functions

- Phase 13 SoD & Access Analysis complete (19/19 milestones)
- ACCESS ANALYSIS tree view with 8 read-only category nodes (Capabilities, Capability Mappings, Capability Grants, SoD Rules, Findings, Mitigations, Scan Runs, Feedback)
- `AccessAnalysisTreeDataProvider` mirroring the Inventory tree pattern; each node opens a detail panel via `DetailPanelController`
- 8 read-only API types and platform client fetchers for the access-analysis surface
- `aurelion.refreshAccessAnalysis` and `aurelion.focusAccessAnalysisView` commands
- `accessAnalysisListRenderer` pure renderer parallel to `inventoryListRenderer`
- Item detail drawer — clicking any row in Inventory or Access Analysis panels opens a new panel with all object fields as key-value rows
- `itemDetailRenderer` with `buildItemDetailRows` and `itemDetailColumns`; SoD rules additionally fetch and display conditions with `min_count` and capability slugs in an extra section
- `fetchSodRuleConditions` client function and `SodRuleConditionFromApi` type
- `buildSodConditionsSection` renderer for the conditions extra section

### Fixed

- Detail panels stuck at "Loading…" — inline script blocked by VS Code / Electron CSP; extracted all webview JS to `media/panel-webview.js` and loaded via `<script src>` with `cspSource` allowlist
- Access Analysis tree items (Capabilities, SoD Rules, etc.) not opening on click — `isOpenDetailPanelArg` guard missing `"accessAnalysis"` case; all 8 category nodes now open correctly
- `GET /capability-grants` returning 400 when opened from the Access Analysis panel — removed mandatory-filter requirement; panel now receives up to 100 grants without a filter
- LLM view refactored from two separate tree views into one unified "LLM" view with Models and Inference sections
- Active model status indicator showing red instead of green — color corrected in `media/panel-webview.js`
- Inference requests sending profile name instead of UUID — `execution_profile_id` now resolved correctly before dispatch

## [0.2.0] - 2026-04-22

### Changed

- **Engineering Studio — unified tree+panel pattern.** Applications and Inventory views no longer expand children inline; clicking a node opens a `WebviewPanel` with the relevant content on the side. Added two new tree views: `Events` (domain-grouped, auto-refreshing panel) and `Logs` (minimum-level filter, auto-refreshing panel). The earlier Phase 11 Step 5 webview view `eventsLogsView` is replaced by these two tree views and their shared `DetailPanelController`. Inventory tree now covers all 15 inventory slices that expose a list endpoint (added: persons, employees, NHIs, employee records).
- **Status bar** now shows application count (`N apps`) instead of connector online/offline counters. Connector count in status bar removed — connector details are now visible in the application's WebviewPanel.
- `aurelion.engineeringStudio.eventsRefreshSeconds` default changed from 10 to 5; description updated to reflect use by all live-data detail panels.

### Added

- `DetailPanelController` — unified WebviewPanel lifecycle management (cap 8 panels, LRU eviction, auto-refresh, CSP + nonce).
- `panels/panelHtml.ts` — single HTML skeleton for all detail panels.
- `panels/renderers/` — four pure renderer modules: `applicationRenderer`, `inventoryListRenderer`, `eventsListRenderer`, `logsListRenderer`.
- `integrations/events/` — `EventsTreeDataProvider` with three static domain nodes (inventory, capabilities, platform) and `classifyEvent` pure classifier.
- `integrations/logsLevels/` — `LogsLevelsTreeDataProvider` with four static level nodes (debug, info, warning, error).
- `integrations/logs/levelFilter.ts` — pure `levelsForMinimum` function for client-side log level fan-out.
- `integrations/inventory/inventoryCategories.ts` — declarative registry for all 15 inventory categories.
- New API types: `PersonFromApi`, `EmployeeFromApi`, `NHIFromApi`, `EmployeeRecordFromApi`.
- New platform client fetchers: `fetchApplication`, `fetchPersons`, `fetchEmployees`, `fetchNHIs`, `fetchEmployeeRecords`.
- Commands: `aurelion.openDetailPanel`, `aurelion.refreshEvents`, `aurelion.refreshLogs`.
- **Application detail panel — editable fields.** `name`, `is_active`, and `required_connector_tags` are now editable inline via injected inputs. A Save button appears (right-aligned, greyed out when no changes) and posts a `patch` message to the extension host via `updateApplication`. "Saved" confirmation appears briefly left of the button.
- **Application detail panel — rich connector section.** Connectors rendered as a separate `Section` table with Status (Online/Offline pill badge), Instance ID, Tags, Last Seen, and Created columns.
- **Logs panel — dual filter bar.** Correlation ID filter (whitespace stripped on input) and Message text filter displayed in a flex row. Time Period (UTC) filter rendered below in a stacked layout (block, not flex). Filters persist across auto-refreshes.

### Removed

- **`eventsLogsView` webview.** Replaced by `eventsView` and `logsView` tree views, each backed by the shared `DetailPanelController`.
- Inline connector-instance subtree under Applications — connector details now live in the application's WebviewPanel.
- 11 `integrations/inventory/*Mapper.ts` files and their tests — replaced by renderer-level mapping in `panels/renderers/inventoryListRenderer.ts`.
- `integrations/statusBar/summary.ts` and its tests — connector summary no longer needed after status bar simplification.
- Command `aurelion.refreshInventoryCategory` — inventory panels are opened fresh on each click; no separate refresh command needed.
- Command `aurelion.copyInstanceId` — connector-instance tree nodes no longer exist in the tree; the command had no remaining UI entry point.

## [0.1.0] - 2026-04-18

### Added

- Phase 8 extension surface for Remote Resources Normalization (Inventory) — types, client methods, tree nodes, and mappers for every inventory slice
- ThreatFact types (`ThreatFactFromApi`, `ThreatFactUpsertPayload`), client methods (`fetchThreatFacts`, `fetchThreatFact`, `upsertThreatFact`), `ThreatFactItemNode` with warning icon, and `threatFactsMapper.ts` + 3 mapper tests
- `AccessUsageFactFromApi` / `AccessUsageFactCreatePayload` types; client methods `fetchAccessUsageFacts`, `fetchAccessUsageFact`, `createAccessUsageFact`
- `AccessUsageFactItemNode` with `pulse` icon; Access Usage Facts category in `InventoryTreeDataProvider` with lazy-load and `(no usage facts)` empty label
- `accessUsageFactsMapper.ts` + 3 mapper tests
- OwnershipAssignment types (`OwnershipKind`, `OwnershipAssignmentFromApi`, `OwnershipAssignmentCreatePayload`) and client methods
- `OwnershipAssignmentItemNode` with `shield` icon; Ownership Assignments category in InventoryTreeDataProvider with lazy-load
- `ownershipAssignmentsMapper.ts` + mapper tests
- Initiative types (`InitiativeFromApi`, `InitiativeType`, `InitiativeCreatePayload`, `InitiativePatchPayload`) and client methods (`fetchInitiatives`, `fetchInitiative`, `createInitiative`, `updateInitiative`)
- Initiatives category in `InventoryTreeDataProvider` with lazy-load; `initiativesMapper.ts` + mapper tests
- ArtifactBinding types: `ArtifactBindingFromApi` type
- ArtifactBinding client methods: `fetchArtifactBindings`, `fetchArtifactBinding`
- `ArtifactBindingItemNode` tree node with `link` icon and `aurelion.inventoryArtifactBinding` contextValue
- Artifact Bindings category in `InventoryTreeDataProvider` with lazy-load
- `artifactBindingsMapper.ts` + `__tests__/artifactBindingsMapper.test.ts` (3 tests)
- AccessFact types: `AccessFactEffect` type alias, `AccessFactFromApi` type
- AccessFact client methods: `fetchAccessFacts`, `fetchAccessFact`
- `AccessFactItemNode` tree node with `key` icon and `aurelion.inventoryAccessFact` contextValue
- Access Facts category in `InventoryTreeDataProvider` with lazy-load
- `accessFactsMapper.ts` + `__tests__/accessFactsMapper.test.ts` (3 tests)
- AccessArtifact types: `AccessArtifactSourceKind` union, `AccessArtifactFromApi`
- AccessArtifact client methods: `fetchAccessArtifacts`, `fetchAccessArtifact`
- `AccessArtifactItemNode` tree node with `archive` icon and `aurelion.inventoryAccessArtifact` contextValue
- Access Artifacts category in `InventoryTreeDataProvider` with lazy-load
- `accessArtifactsMapper.ts` + `__tests__/accessArtifactsMapper.test.ts` (3 tests)
- Resource types, client methods, ResourceItemNode tree node, and Resources category in InventoryTreeDataProvider
- Inventory tree now shows the `Accounts` category. New `AccountItemNode` renders each account as `<username> · <app-prefix> · <status>`. Types `AccountFromApi`, `AccountPatchPayload`, `AccountStatus` and client methods `fetchAccounts`, `fetchAccount`, `updateAccount` added.
- Subject TypeScript types: SubjectFromApi, SubjectKind, SubjectNHIKind, SubjectStatus (wide union), SubjectCreatePayload, SubjectPatchPayload
- Subject client methods: fetchSubjects, fetchSubject, createSubject, updateSubject
- SubjectCategoryNode registered in InventoryTreeDataProvider category registry; lazy-load via fetchSubjects(); SubjectItemNode (label=external_id, description=kind·status, tooltip with subject_id/nhi_kind/status/principal/updated_at, contextValue=aurelion.subjectItem); subjectsMapper.ts + __tests__/subjectsMapper.test.ts
- Inventory view (aurelion.engineeringStudio.inventoryView) with InventoryTreeDataProvider: category registry, childrenCache state machine (loading / loaded / failed), Customers category with lazy fetch, FailedCategoryChildNode with inline retry command, customersMapper.ts and __tests__/customersMapper.test.ts
- Customer TypeScript types: CustomerFromApi, CustomerCreatePayload, CustomerPatchPayload, CustomerAttributeFromApi, CustomerAttributeCreatePayload, CustomerTenantRole, CustomerPlanTier
- Customer client methods: fetchCustomers, fetchCustomer, createCustomer, updateCustomer, fetchCustomerAttributes, addCustomerAttribute, removeCustomerAttribute
- aurelion.refreshInventory and aurelion.refreshInventoryCategory commands with view/item/context menu on aurelion.inventoryCategory nodes
- ApplicationFromApi gains required code field; ApplicationCreatePayload and ApplicationPatchPayload types added; updateApplication client method added
- ActionKind string-literal union type
- Rich log format parity with aurelion-gui: every log event exposes `event_type`, `correlation_id`, and participant chain alongside `[LEVEL] HH:MM:SS.sss`; `connector.command.*` events use display titles from `connectorCommandDisplayTitle` (Step 9)
- Phase 7 static gates: `src/__tests__/phase07Gates.test.ts` — six automated invariants covering webview residue, `LogOutputChannel` single-use, `setInterval` count, `engines.vscode` compat, command registration completeness/uniqueness/no-extras, and `console.*` absence (Step 10)
- Editor-group virtual log document (`aurelion-logs:` scheme via `TextDocumentContentProvider`); clicking an app node opens logs beside the tree; tab label `Aurelion logs · <app name>`; ring buffer cap 5000 lines (Step 8)
- Auto-reconnect 2s `setInterval` poller: starts on first refresh failure, stops on first success; no exponential backoff, no new setting; timer cleared on `deactivate` (Step 7)
- `contributes.viewsWelcome` entry for the Applications view — shown when `getChildren()` returns an empty root, displays a **Refresh applications** command link and a hint to check `aurelion.engineeringStudio.apiBaseUrl` in Settings (Step 6)
- Context menu on Applications tree: `Focus Application…`, `Open Logs`, `Toggle Log Streaming`, `Refresh Application` on app nodes; `Copy Connector Instance Id` on connector nodes (Step 5)
- `aurelion.copyInstanceId` command — copies connector instance id to clipboard; shows `$(check) Aurelion: instance id copied` in status bar on success; hidden from Command Palette (Step 5)
- `aurelion.focusApplication` command — from context menu reveals the app node; from Command Palette opens a quick pick and reveals the selected node (Step 5)
- `ApplicationsTreeDataProvider.getAppNodeById(id)` — public method returning the live `AppNode` for a given id (Step 5)
- ESLint `no-console: error` rule to enforce `extensionChannel`-only logging discipline (Step 5)
- StatusBarItem showing `$(plug) N/M connectors online` — hidden when no connectors loaded; switches to `$(warning) Aurelion kernel unreachable` with warning background on failed refresh (Step 4)
- `aurelion.focusApplicationsView` command (`Aurelion: Reveal applications view`) — reveals the Aurelion activity-bar container; status bar click triggers this command (Step 4)
- `aurelion.engineeringStudio.refreshIntervalMs` setting (default `0` — manual only; positive value enables auto-refresh tick; minimum effective 5000ms) (Step 4)
- `ApplicationsTreeDataProvider.onDidChangeState` event, `getConnectorSummary()`, `setAutoRefreshIntervalMs()` (Step 4)
- Extension-level `Aurelion · Extension` `LogOutputChannel` for internal errors (Step 3)
- `aurelion.engineeringStudio.logStreamPollMs` setting (default `2500`, minimum `500`) (Step 3)
- `logs/` infrastructure: `levelMap.ts`, `streamer.ts` (`LogStreamer` with single shared tick, seed + incremental fetch, failure throttling) (Step 3)
- `aurelion.openLogs` command — opens virtual log document for selected application (Step 3)
- `aurelion.toggleLogStreaming` command — flips streaming on/off per app; shows `[streaming]` marker in quick pick (Step 3)
- `aurelion.refreshApplication` per-app refresh command — reentrancy-guarded, inline button on app nodes (Step 2)
- Connector instances as expandable children of each application node with online/offline `ThemeIcon` (Step 2)
- `TreeView.badge` with offline connector instance count on the view header, cleared when all online (Step 2)
- `TreeView.message` inline error narration on full-refresh failure, cleared on recovery (Step 2)
- Error throttling — single `showErrorMessage` toast with `Retry` action per consecutive failure streak (Step 2)
- Empty-state child node for applications with zero connector instances (Step 2)
- Native Applications TreeView (root nodes only); `aurelion.refreshApplications` command with refresh button in view title bar (Step 1)

### Changed

- Log surface migrated from Output-panel `LogOutputChannel` to `TextDocumentContentProvider`-based editor tab; log lines now include inline `[LEVEL]` prefix, timestamp, `event_type`, and participant chain (Steps 8–9)
- Log line format parity with web GUI: `event_type` and `correlation_id` surfaced on every event; `connector.command.*` events show human-readable display titles (Step 9)

### Removed

- `IntegrationsViewProvider` and `aurelion.engineeringStudio.integrationsView` webview — entire file `src/integrations/integrationsViewProvider.ts` deleted (inline HTML, CSP/`getNonce` scaffolding, `postMessage` protocol, webview-side log polling loop) (Step 6)
- `src/integrations/mapApplication.ts` (`mapToInstalledApplication`) — dead code after provider removal (Step 6)
- `formatParticipantChain` export from `src/integrations/format.ts` — only consumer was `integrationsViewProvider.ts` (Step 6)
- Per-app `LogOutputChannel`s and `logs/channels.ts` (`LogChannelRegistry`) — replaced by virtual document buffers (Step 8)
- `command aurelion.revealStatusBar` — renamed to `aurelion.focusApplicationsView` (Step 4)

### Breaking

- **View id changed**: `aurelion.engineeringStudio.integrationsView` (webview) → `aurelion.engineeringStudio.applicationsView` (tree). Users who pinned the old view to a custom side-bar layout will see their pin disappear on first load after upgrade. Re-pin the new view manually — there is no migration path.
- **Command renamed**: `aurelion.revealStatusBar` → `aurelion.focusApplicationsView`. Any keybinding or task referencing the old command name must be updated.
- **Logs surface changed**: Application logs now open as an editor tab (scheme `aurelion-logs:`, view column beside, read-only virtual document) instead of an Output channel. Per-app `LogOutputChannel`s removed. Extension-internal `Aurelion · Extension` channel kept. The native level filter dropdown is gone — levels are rendered as inline text prefixes (`[LEVEL]`). Reload window discards buffers (expected). Ring buffer cap: 5000 lines per app.
