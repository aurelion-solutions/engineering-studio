import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";

const SSE_PARSER_PATH = path.resolve(__dirname, "..", "sseParser.js");

type SseParserModule = {
  parseSseStream: (
    stream: ReadableStream<Uint8Array>,
    options?: {
      signal?: AbortSignal;
      onParseError?: (raw: string, err: unknown) => void;
    },
  ) => AsyncGenerator<unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseSseStream } = require(SSE_PARSER_PATH) as SseParserModule;

/** Build a ReadableStream from a single string. */
function streamFromString(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

/** Build a ReadableStream from multiple chunks (simulates chunked delivery). */
function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

/** Collect all yielded values from the async generator. */
async function collect(
  stream: ReadableStream<Uint8Array>,
  options?: {
    signal?: AbortSignal;
    onParseError?: (raw: string, err: unknown) => void;
  },
): Promise<unknown[]> {
  const results: unknown[] = [];
  for await (const item of parseSseStream(stream, options)) {
    results.push(item);
  }
  return results;
}

describe("parseSseStream", () => {
  it("yields one object for a single data frame", async () => {
    const text = 'data: {"token":"a","done":false}\n\n';
    const results = await collect(streamFromString(text));
    assert.deepEqual(results, [{ token: "a", done: false }]);
  });

  it("handles multi-message stream with buffer split mid-line", async () => {
    const chunks = [
      'data: {"token":"hello","done":false}\n\ndata: {"tok',
      'en":"world","done":false}\n\n',
    ];
    const results = await collect(streamFromChunks(chunks));
    assert.deepEqual(results, [
      { token: "hello", done: false },
      { token: "world", done: false },
    ]);
  });

  it("delivers done:true as last item; EOF without trailing \\n\\n still flushes", async () => {
    const text = [
      'data: {"token":"a","done":false}\n\n',
      'data: {"output":"full","model":"gpt","tokens_used":10,"latency_ms":100,"done":true}',
    ].join("");
    const results = await collect(streamFromString(text));
    assert.equal(results.length, 2);
    const last = results[1] as Record<string, unknown>;
    assert.equal(last["done"], true);
    assert.equal(last["output"], "full");
  });

  it("calls onParseError for bad JSON frame and continues yielding", async () => {
    const text =
      'data: NOT_JSON\n\ndata: {"token":"ok","done":false}\n\n';
    const errors: string[] = [];
    const results = await collect(streamFromString(text), {
      onParseError: (raw) => errors.push(raw),
    });
    assert.equal(errors.length, 1);
    assert.equal(errors[0], "NOT_JSON");
    assert.deepEqual(results, [{ token: "ok", done: false }]);
  });

  it("throws AbortError when signal is already aborted", async () => {
    const encoder = new TextEncoder();
    const controller = new AbortController();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode('data: {"token":"a","done":false}\n\n'));
        // Do not close — simulate infinite stream
      },
    });

    controller.abort();
    await assert.rejects(
      () => collect(stream, { signal: controller.signal }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.name, "AbortError");
        return true;
      },
    );
  });
});
