import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConnectorSummary } from "../summary.js";

test("empty input → { online: 0, total: 0 }", () => {
  const result = computeConnectorSummary([]);
  assert.deepEqual(result, { online: 0, total: 0 });
});

test("only apps with undefined instances → { online: 0, total: 0 }", () => {
  const result = computeConnectorSummary([
    { instances: undefined },
    { instances: undefined },
  ]);
  assert.deepEqual(result, { online: 0, total: 0 });
});

test("mixed: non-empty + undefined + empty → counts only loaded", () => {
  const result = computeConnectorSummary([
    {
      instances: [
        { is_online: true },
        { is_online: true },
        { is_online: false },
      ],
    },
    { instances: undefined },
    { instances: [] },
  ]);
  assert.deepEqual(result, { online: 2, total: 3 });
});

test("all offline → { online: 0, total: N }", () => {
  const result = computeConnectorSummary([
    { instances: [{ is_online: false }, { is_online: false }] },
    { instances: [{ is_online: false }, { is_online: false }] },
  ]);
  assert.deepEqual(result, { online: 0, total: 4 });
});

test("all online → { online: N, total: N }", () => {
  const result = computeConnectorSummary([
    { instances: [{ is_online: true }, { is_online: true }] },
    { instances: [{ is_online: true }, { is_online: true }] },
  ]);
  assert.deepEqual(result, { online: 4, total: 4 });
});

test("large input smoke — 1000 apps × 10 instances (50% online) — under 50ms", () => {
  const apps = Array.from({ length: 1000 }, (_, i) => ({
    instances: Array.from({ length: 10 }, (__, j) => ({
      is_online: (i * 10 + j) % 2 === 0,
    })),
  }));

  const start = performance.now();
  const result = computeConnectorSummary(apps);
  const elapsed = performance.now() - start;

  assert.equal(result.total, 10000);
  assert.equal(result.online, 5000);
  assert.ok(elapsed < 50, `Expected < 50ms but took ${elapsed.toFixed(2)}ms`);
});
