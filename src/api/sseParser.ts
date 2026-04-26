/**
 * Pure SSE parser — no vscode dependencies.
 * Parses a ReadableStream<Uint8Array> of text/event-stream data.
 * Yields parsed JSON objects for every `data:` line.
 */

export interface SseParserOptions {
  signal?: AbortSignal;
  onParseError?: (raw: string, err: unknown) => void;
}

export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
  options?: SseParserOptions,
): AsyncGenerator<unknown> {
  const signal = options?.signal;
  const onParseError = options?.onParseError;

  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const { value, done } = await reader.read();

      if (done) {
        // Final flush — try remaining buffer content
        const remaining = decoder.decode(undefined, { stream: false });
        buffer += remaining;
        if (buffer.trim() !== "") {
          yield* _processBuffer(buffer, onParseError);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process all complete SSE blocks (separated by \n\n)
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        yield* _processBlock(block, onParseError);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function* _processBuffer(
  text: string,
  onParseError?: (raw: string, err: unknown) => void,
): Generator<unknown> {
  // text may contain multiple blocks separated by \n\n or a single partial block
  const blocks = text.split("\n\n");
  for (const block of blocks) {
    if (block.trim() !== "") {
      yield* _processBlock(block, onParseError);
    }
  }
}

function* _processBlock(
  block: string,
  onParseError?: (raw: string, err: unknown) => void,
): Generator<unknown> {
  const lines = block.split("\n");
  for (const line of lines) {
    if (line === "" || line.startsWith(":")) {
      // Empty line or comment — skip
      continue;
    }
    if (line.startsWith("data:")) {
      const raw = line.slice(5).replace(/^ /, ""); // strip exactly one leading space
      if (raw === "") {
        continue;
      }
      try {
        yield JSON.parse(raw) as unknown;
      } catch (err) {
        onParseError?.(raw, err);
      }
    }
    // Ignore other SSE fields (event:, id:, retry:)
  }
}
