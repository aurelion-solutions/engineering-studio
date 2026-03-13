# Aurelion Engineering Studio

A [Visual Studio Code](https://code.visualstudio.com/) extension that integrates **Aurelion Engineering Studio** tooling and workflows into the editor.

## Features

- **Applications tree** (Aurelion activity bar): installed applications as root nodes (`GET /api/v0/applications`), each expandable to show **connector instances** with online/offline `ThemeIcon` state (`GET /api/v0/applications/{id}/matching-connector-instances`). Badge on the view header shows the offline count.
- **Log streaming**: `Aurelion: Show logs for application…` and `Aurelion: Toggle log streaming for application` commands open a native `OutputChannel` per app — searchable with `Cmd+F`, copy-pasteable, no webview overhead.
- **Status bar**: shows `$(plug) N/M connectors online`; switches to `$(warning) Aurelion kernel unreachable` on failed refresh; click reveals the Applications view.
- **Command Palette integration**: all actions (`Refresh applications`, `Show logs`, `Toggle log streaming`, `Focus application…`, `Reveal applications view`) are discoverable via `Cmd+Shift+P` → `Aurelion:`.
- **Empty-state guidance**: when the Applications tree is empty, a welcome message with a **Refresh** link is shown inline, along with a hint to check `aurelion.engineeringStudio.apiBaseUrl` in Settings.

Not in scope yet: application edit modal, password-policy placeholders, and the JSON **Application configuration** editor block.

## Settings

| ID | Default | Purpose |
|----|---------|---------|
| `aurelion.engineeringStudio.apiBaseUrl` | `http://localhost:8000` | Platform API root (same role as `VITE_API_BASE_URL` in **aurelion-gui**). Changing it triggers an immediate tree refresh. |
| `aurelion.engineeringStudio.logStreamPollMs` | `2500` | Polling interval in milliseconds for the log stream. Minimum 500ms. |
| `aurelion.engineeringStudio.refreshIntervalMs` | `0` | Auto-refresh interval for the Applications tree. `0` disables auto-refresh (manual only). Minimum effective value is 5000ms. |

## Requirements

- [VS Code](https://code.visualstudio.com/) **1.90** or newer (see `engines.vscode` in `package.json`).
- [Node.js](https://nodejs.org/) **18** or newer (current LTS recommended; `fetch` in the extension host).
- [pnpm](https://pnpm.io/) **10** (version is pinned in `package.json` → `packageManager`). Enable [Corepack](https://nodejs.org/api/corepack.html) with `corepack enable`; pnpm will be used automatically when you run `pnpm install` in this folder.
- **Aurelion Platform API** reachable at the configured base URL (e.g. local `uvicorn` for **aurelion-kernel**).

## Usage

1. Open the **Aurelion** icon in the **Activity Bar**.
2. Open the **Applications** view. If no applications are shown, click the **Refresh applications** link in the empty-state message, or run `Aurelion: Refresh applications` from the Command Palette (`Cmd+Shift+P`).
3. Expand an application node to see its **connector instances** with online/offline state.
4. Right-click an application node for context menu actions: **Focus Application**, **Open Logs**, **Toggle Log Streaming**, **Refresh Application**.
5. Right-click a connector instance node to **Copy Connector Instance Id**.
6. Use `Aurelion: Show logs for application…` (`Cmd+Shift+P`) to open a log `OutputChannel` for any loaded app. Use `Aurelion: Toggle log streaming for application` to enable/disable live streaming.

## Development

### Install dependencies

```bash
cd aurelion-engineering-studio
pnpm install
```

### Build

```bash
pnpm run compile
```

Output goes to `out/`; the entry point is set by the `main` field in `package.json`.

### Watch mode

```bash
pnpm run watch
```

Useful together with debugging (below).

### Linting

```bash
pnpm run lint
```

Uses [ESLint](https://eslint.org/) 9 with flat config (`eslint.config.mjs`) and [typescript-eslint](https://typescript-eslint.io/).

### Run the extension (debug)

With the **monorepo root** (`code`) open as the workspace (not this folder alone):

1. Run `pnpm install` once inside `aurelion-engineering-studio` (see above).
2. Open **Run and Debug** and select **Aurelion:Engineering Studio Extension**, or focus that configuration and press **F5**.

Launch and watch tasks live in **`.vscode/` at the repository root** next to this package.

A new **[Extension Development Host]** window opens with the extension loaded. Use the **Aurelion** activity bar entry and the **Applications** view.

### Package a `.vsix`

After installing dependencies and building:

```bash
pnpm exec vsce package
```

or

```bash
pnpm run package
```

This produces `aurelion-engineering-studio-0.1.0.vsix` (version from `package.json`). Install via **Extensions → … → Install from VSIX…**.

Publishing to the Marketplace requires a publisher account and the `publisher` field in `package.json`; see the [publishing documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension). The manifest includes a **128×128** PNG `icon`, `galleryBanner` (store page header), and `license` as recommended for the gallery.

## Project layout

| Path | Purpose |
|------|---------|
| `src/extension.ts` | Activation, tree view + status bar + log streamer wiring, settings listener |
| `src/api/` | HTTP client and DTOs aligned with **aurelion-gui** entities |
| `src/integrations/applicationsTree.ts` | `ApplicationsTreeDataProvider` — root app nodes + connector children |
| `src/integrations/applicationsMapper.ts` | Pure mapper: API response → `AppNode` |
| `src/integrations/connectorInstancesMapper.ts` | Pure mapper: API response → `ConnectorNode` |
| `src/integrations/connectorIcon.ts` | Pure helper: online/offline `ThemeIcon` |
| `src/integrations/format.ts` | Display strings (log titles, timestamps) |
| `src/integrations/logs/` | `LogChannelRegistry` + `LogStreamer` for per-app `OutputChannel` log streaming |
| `src/integrations/statusBar/` | `StatusBarController` + `computeConnectorSummary` helper |
| `src/integrations/commands/` | Type-guards (`guards.ts`) for context-menu command arguments |
| `out/` | Compiled JavaScript (not committed) |
| `package.json` | Extension manifest: `contributes`, dependencies |
| `media/icon.png` | Activity bar / marketplace icon (from **aurelion-gui** favicon) |
| `LICENSE` | Apache License 2.0 text (packaged as `LICENSE.txt` in the `.vsix`) |
| `pnpm-lock.yaml` | Locked dependency versions (commit to the repository) |
| `tsconfig.json` | Strict TypeScript, `outDir`: `out` |
| `eslint.config.mjs` | Lint rules for `src/**/*.ts` |
| `.vscodeignore` | Files excluded when packaging with `vsce` |
| `../.vscode/` | Debug launch and tasks for this extension (monorepo root) |

## Conventions

- **Contribution IDs** use the `aurelion.engineeringStudio.*` prefix.
- **HTTP** runs in the extension host (`src/api/platformClient.ts`) — no browser CORS limitations; calls go directly from Node.
- **Sources** are TypeScript; the published package contains `out/` only — `src/` is listed in `.vscodeignore`.

## License

Apache License 2.0 — see `LICENSE` and the `license` field in `package.json`.
