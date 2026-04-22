/**
 * Phase 7 Static Gates — six invariants that must hold across the entire extension.
 * Pure node:test + node:fs + node:path, no vscode import, no external deps.
 *
 * Run as part of `pnpm test` (compiled output picked up by the test glob).
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";

// ─── helpers ──────────────────────────────────────────────────────────────────

// __dirname at runtime = <extension-root>/out/__tests__
// Two levels up → <extension-root>
const ROOT = path.resolve(__dirname, "..", ".."); // aurelion-engineering-studio/
const SRC = path.join(ROOT, "src");
const MEDIA = path.join(ROOT, "media");

/**
 * Recursively collect files under `dir` that match `predicate`.
 * Skips symlinks.
 */
function collectFiles(dir: string, predicate: (f: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  const results: string[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const full = path.join((e as fs.Dirent & { parentPath?: string }).parentPath ?? (e as unknown as { path: string }).path, e.name);
    if (predicate(full)) results.push(full);
  }
  return results;
}

/**
 * Collect TypeScript source files, excluding __tests__ directories.
 */
function tsFiles(dir: string): string[] {
  return collectFiles(dir, (f) => f.endsWith(".ts") && !f.includes("__tests__"));
}

/**
 * Read a file and return its lines as an array.
 */
function lines(file: string): string[] {
  return fs.readFileSync(file, "utf8").split("\n");
}

// ─── Gate (a) — No webview residue ───────────────────────────────────────────
//
// WebviewPanel usage is intentionally contained in src/panels/ (DetailPanelController,
// panelHtml.ts) and src/extension.ts. The gate prevents accidental webview
// leakage into integrations and other slices.

describe("Gate (a): no webview residue", () => {
  // Literals are stored split so this gate file does not trigger itself.
  const FORBIDDEN = [
    "Integrations" + "ViewProvider",
    "integrations" + "ViewProvider",
    "register" + "Webview" + "ViewProvider",
    "webview" + "View",
    "post" + "Message",
    "get" + "Nonce",
    "media/" + "webview",
  ];

  // Files/directories that legitimately use webview APIs.
  const ALLOWED_DIRS = [path.join(SRC, "panels")];
  const ALLOWED_FILES = [path.join(SRC, "extension.ts")];

  function isAllowed(file: string): boolean {
    return (
      ALLOWED_DIRS.some((d) => file.startsWith(d)) ||
      ALLOWED_FILES.includes(file)
    );
  }

  it("src/ (excluding __tests__ and panels/) has no webview residue", () => {
    const files = tsFiles(SRC).filter((f) => !isAllowed(f));
    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        if (content.includes(token)) {
          violations.push(`${file}: contains "${token}"`);
        }
      }
    }
    assert.deepEqual(
      violations,
      [],
      `Webview residue found:\n${violations.join("\n")}`,
    );
  });

  it("media/ has no webview residue", () => {
    const mediaFiles = collectFiles(MEDIA, (f) =>
      [".ts", ".js", ".css", ".html"].some((ext) => f.endsWith(ext)),
    );
    const violations: string[] = [];
    for (const file of mediaFiles) {
      const content = fs.readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        if (content.includes(token)) {
          violations.push(`${file}: contains "${token}"`);
        }
      }
    }
    assert.deepEqual(
      violations,
      [],
      `Webview residue in media/:\n${violations.join("\n")}`,
    );
  });
});

// ─── Gate (b) — LogOutputChannel single usage ─────────────────────────────────

describe("Gate (b): LogOutputChannel only in extension.ts", () => {
  it("createOutputChannel appears exactly once across src/ (excluding __tests__)", () => {
    const files = tsFiles(SRC);
    const matches: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const re = /createOutputChannel\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const lineNo = content.slice(0, m.index).split("\n").length;
        matches.push(`${file}:${lineNo}`);
      }
    }
    assert.equal(
      matches.length,
      1,
      `Expected exactly 1 createOutputChannel call, found ${matches.length}:\n${matches.join("\n")}`,
    );
  });

  it("the single createOutputChannel call is in extension.ts", () => {
    const extFile = path.join(SRC, "extension.ts");
    const content = fs.readFileSync(extFile, "utf8");
    assert.ok(
      /createOutputChannel\s*\(/.test(content),
      "extension.ts must contain createOutputChannel",
    );
  });

  it('the call uses "Aurelion · Extension" and { log: true } within ±3 lines', () => {
    const extFile = path.join(SRC, "extension.ts");
    const fileLines = lines(extFile);
    const callIdx = fileLines.findIndex((l) => /createOutputChannel\s*\(/.test(l));
    assert.ok(callIdx >= 0, "createOutputChannel not found in extension.ts");

    const window = fileLines
      .slice(Math.max(0, callIdx - 3), callIdx + 4)
      .join("\n");
    assert.ok(
      window.includes("Aurelion \u00b7 Extension"),
      'The createOutputChannel call must use channel name "Aurelion · Extension"',
    );
    assert.ok(
      window.includes("log: true"),
      "The createOutputChannel call must pass { log: true }",
    );
  });

  it("src/integrations/logs/ has zero createOutputChannel calls", () => {
    const logsDir = path.join(SRC, "integrations", "logs");
    const files = tsFiles(logsDir);
    const matches: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      if (/createOutputChannel\s*\(/.test(content)) {
        matches.push(file);
      }
    }
    assert.deepEqual(
      matches,
      [],
      `createOutputChannel must not appear in logs/:\n${matches.join("\n")}`,
    );
  });
});

// ─── Gate (c) — Exactly one setInterval in logs/ ─────────────────────────────

describe("Gate (c): exactly one setInterval in src/integrations/logs/", () => {
  it("setInterval appears exactly once in logs/ source files", () => {
    const logsDir = path.join(SRC, "integrations", "logs");
    const files = tsFiles(logsDir);
    const matches: Array<{ file: string; line: number }> = [];
    for (const file of files) {
      const fileLines = lines(file);
      fileLines.forEach((l, idx) => {
        if (/\bsetInterval\s*\(/.test(l)) {
          matches.push({ file, line: idx + 1 });
        }
      });
    }
    assert.equal(
      matches.length,
      1,
      `Expected exactly 1 setInterval in logs/, found ${matches.length}:\n` +
        matches.map((m) => `  ${m.file}:${m.line}`).join("\n"),
    );
  });

  it("the single setInterval is in streamer.ts", () => {
    const streamerFile = path.join(SRC, "integrations", "logs", "streamer.ts");
    const content = fs.readFileSync(streamerFile, "utf8");
    assert.ok(
      /\bsetInterval\s*\(/.test(content),
      "Expected setInterval to be in streamer.ts",
    );
  });
});

// ─── Gate (d) — engines.vscode compat ────────────────────────────────────────

describe("Gate (d): engines.vscode compat", () => {
  const PKG = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as {
    engines: { vscode: string };
    devDependencies: Record<string, string>;
  };

  it('engines.vscode is "^1.90.0"', () => {
    assert.equal(
      PKG.engines.vscode,
      "^1.90.0",
      `engines.vscode must be "^1.90.0", got "${PKG.engines.vscode}"`,
    );
  });

  it('@types/vscode devDependency matches the 1.90 major.minor floor', () => {
    const typesVscode = PKG.devDependencies["@types/vscode"];
    assert.ok(
      typesVscode !== undefined,
      "@types/vscode must be in devDependencies",
    );
    // Accept ^1.90.x or ~1.90.x — must contain "1.90"
    assert.ok(
      typesVscode.includes("1.90"),
      `@types/vscode must match 1.90 major.minor, got "${typesVscode}"`,
    );
  });
});

// ─── Gate (e) — All commands registered ──────────────────────────────────────

describe("Gate (e): all package.json commands registered in activate", () => {
  const PKG = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as {
    contributes: { commands: Array<{ command: string }> };
  };

  const declared = new Set(PKG.contributes.commands.map((c) => c.command));

  // Collect all registerCommand("<id>", ...) calls from src/**/*.ts (excl. __tests__)
  type Registration = { id: string; file: string; line: number };
  const registered: Registration[] = [];

  const files = tsFiles(SRC);
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    // Match across lines: registerCommand( optionally followed by whitespace/newline then the id string
    const re = /registerCommand\(\s*["'`]([^"'`]+)["'`]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const lineNo = content.slice(0, m.index).split("\n").length;
      registered.push({ id: m[1], file, line: lineNo });
    }
  }

  const registeredIds = registered.map((r) => r.id);
  const registeredIdSet = new Set(registeredIds);

  it("every declared command is registered (completeness)", () => {
    const missing = [...declared].filter((id) => !registeredIdSet.has(id));
    assert.deepEqual(
      missing,
      [],
      `Commands declared in package.json but not registered:\n${missing.join("\n")}`,
    );
  });

  it("each command is registered exactly once (uniqueness)", () => {
    const counts = new Map<string, number>();
    for (const id of registeredIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const duplicates = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => `${id} (${count}x)`);
    assert.deepEqual(
      duplicates,
      [],
      `Commands registered more than once:\n${duplicates.join("\n")}`,
    );
  });

  it("no extra commands registered beyond what package.json declares (no-extras)", () => {
    const extras = [...registeredIdSet].filter((id) => !declared.has(id));
    assert.deepEqual(
      extras,
      [],
      `Commands registered but not declared in package.json:\n${extras.join("\n")}`,
    );
  });
});

// ─── Gate (f) — No console.* calls in src/ ───────────────────────────────────

describe("Gate (f): no console.* calls in src/ (excluding __tests__)", () => {
  it("zero console.log/error/warn/info/debug/trace in src/", () => {
    const files = tsFiles(SRC);
    const violations: string[] = [];
    const re = /\bconsole\.(log|error|warn|info|debug|trace)\s*\(/;
    for (const file of files) {
      const fileLines = lines(file);
      fileLines.forEach((l, idx) => {
        if (re.test(l)) {
          violations.push(`${file}:${idx + 1}: ${l.trim()}`);
        }
      });
    }
    assert.deepEqual(
      violations,
      [],
      `console.* calls found:\n${violations.join("\n")}`,
    );
  });
});
