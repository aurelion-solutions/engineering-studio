# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
