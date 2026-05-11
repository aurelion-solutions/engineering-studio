/**
 * Registers the aurelion-pipeline schema contributor with redhat.vscode-yaml.
 * Imports vscode only. No top-level side effects.
 *
 * Defensive shape-check ladder (4 rungs):
 *   1. getExtension("redhat.vscode-yaml") === undefined  → yaml_extension_missing
 *   2. ext.activate() exports non-object                 → yaml_exports_missing
 *   3. typeof exports.registerContributor !== "function" → yaml_registerContributor_missing
 *   4. Call registerContributor(...)                     → success
 *
 * notifyChanged() is buffered via a single boolean flag so calls before
 * activation resolves are replayed once the activation settles.
 */
import * as vscode from "vscode";
import type { LiveSchemaCache } from "./liveSchemaCache";

export const VIRTUAL_URI =
  "aurelion-pipeline://merged/pipeline.schema.json";

/** Regex matching files under any pipelines/ directory. */
export const FILE_GLOB = /[\\/]pipelines[\\/][^\\/]+\.(ya?ml)$/i;

export interface RegisterArgs {
  cache: LiveSchemaCache;
  bundled: unknown;
  extensionChannel: vscode.LogOutputChannel;
}

export interface Contributor {
  /** Forward a schema-change notification to the YAML extension (if available). */
  notifyChanged(): void;
  dispose(): void;
}

/** Shape expected from redhat.vscode-yaml activation exports. */
interface YamlExtensionExports {
  registerContributor: (
    schemaId: string,
    requestSchema: (resource: string) => string | undefined,
    requestSchemaContent: (uri: string) => string | undefined,
  ) => void;
  notifySchemaChanged?: (uri: string) => void;
}

/** Rung-2 check: activation exports are a plain object (not null, not an array, etc.) */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Rung-3 check: exports expose a callable registerContributor */
function hasRegisterContributor(v: Record<string, unknown>): v is Record<string, unknown> & YamlExtensionExports {
  return typeof v["registerContributor"] === "function";
}

/**
 * Register the contributor with redhat.vscode-yaml and return a handle.
 * Returns synchronously; activation of the YAML extension happens async
 * inside a void-awaited IIFE.
 */
export function register(args: RegisterArgs): Contributor {
  const { cache, bundled, extensionChannel } = args;

  // Resolved exports from the YAML extension — set once activation settles.
  let yamlExports: YamlExtensionExports | undefined;
  // True if notifyChanged() was called before activation completed.
  let pendingNotify = false;

  void (async () => {
    // Rung 1: extension present?
    const ext = vscode.extensions.getExtension("redhat.vscode-yaml");
    if (ext === undefined) {
      extensionChannel.warn(
        "pipeline_schema.yaml_extension_missing",
      );
      return;
    }

    // Rung 2: activation exports are a plain object?
    let rawExports: unknown;
    try {
      rawExports = await ext.activate();
    } catch {
      rawExports = undefined;
    }
    if (!isPlainObject(rawExports)) {
      extensionChannel.warn(
        "pipeline_schema.yaml_exports_missing",
      );
      return;
    }

    // Rung 3: registerContributor is a function?
    if (!hasRegisterContributor(rawExports)) {
      extensionChannel.warn(
        "pipeline_schema.yaml_registerContributor_missing",
      );
      return;
    }

    // Rung 4: register
    yamlExports = rawExports;
    rawExports.registerContributor(
      "aurelion-pipeline",
      (resource: string) =>
        FILE_GLOB.test(resource) ? VIRTUAL_URI : undefined,
      (uri: string) =>
        uri === VIRTUAL_URI
          ? JSON.stringify(cache.getActiveSchema(bundled))
          : undefined,
    );

    // Replay buffered notify
    if (pendingNotify) {
      pendingNotify = false;
      dispatchNotify();
    }
  })();

  function dispatchNotify(): void {
    if (
      yamlExports !== undefined &&
      typeof yamlExports.notifySchemaChanged === "function"
    ) {
      yamlExports.notifySchemaChanged(VIRTUAL_URI);
    }
  }

  return {
    notifyChanged(): void {
      if (yamlExports === undefined) {
        // Activation not yet complete — buffer the signal
        pendingNotify = true;
        return;
      }
      dispatchNotify();
    },
    dispose(): void {
      // Nothing to release — the YAML extension owns contributor lifetime.
    },
  };
}
