/**
 * Pure in-memory holder for the live pipeline schema.
 * No I/O. No vscode import. No side effects on import.
 */

export class LiveSchemaCache {
  private _live: unknown = undefined;
  private _hasLive = false;

  /**
   * Store the live schema returned by the kernel.
   * Throws TypeError if schema is undefined or null — both indicate a bug
   * at the call site (the caller should use clearLive() to reset to bundled).
   */
  setLive(schema: unknown): void {
    if (schema === undefined) {
      throw new TypeError(
        "LiveSchemaCache.setLive: schema must be defined",
      );
    }
    if (schema === null) {
      throw new TypeError(
        "LiveSchemaCache.setLive: schema must not be null; call clearLive() to reset to bundled",
      );
    }
    this._live = schema;
    this._hasLive = true;
  }

  clearLive(): void {
    this._live = undefined;
    this._hasLive = false;
  }

  hasLive(): boolean {
    return this._hasLive;
  }

  /**
   * Returns the live schema if present, otherwise the provided bundled schema.
   * The caller guarantees that `bundled` is never mutated after passing it here.
   */
  getActiveSchema(bundled: unknown): unknown {
    return this._hasLive ? this._live : bundled;
  }
}
