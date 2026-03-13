/**
 * Ring-buffered log store — no vscode dependency.
 * Unit-testable via `node --test`.
 *
 * Cap is 5000 lines (not events). With the 3-line-per-event format introduced in
 * Amendment C (Step 9), effective capacity is ~1666 events. Acceptable per spec.
 */

export const BUFFER_CAP_LINES = 5000;

/**
 * Fixed-capacity ring buffer of log lines.
 * When cap is exceeded the oldest lines are dropped (FIFO via Array.shift).
 *
 * append() accepts a batch of lines (e.g. the string[] returned by formatLogLine).
 * Each element is pushed individually and counts toward the cap.
 */
export class LogBuffer {
  private readonly lines: string[] = [];

  append(lines: readonly string[]): void {
    for (const line of lines) {
      if (this.lines.length >= BUFFER_CAP_LINES) {
        this.lines.shift();
      }
      this.lines.push(line);
    }
  }

  /**
   * Returns all buffered lines joined by newline.
   * Empty buffer returns empty string.
   */
  render(): string {
    return this.lines.join("\n");
  }
}
