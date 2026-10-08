import assert from "node:assert/strict";
import test from "node:test";
import { startServer } from "../server.mjs";

const expected = {
  10707621: {
    name: "SHANTI- 12PC- DINNERWARE",
    sku: "880369836232",
    upc_e: "10707621",
    regular_price: 69.99,
  },
  10707620: {
    name: "GREEN SYLVA- 12PC- DINNERWARE",
    sku: "880369836225",
    upc_e: "10707620",
    regular_price: 39.99,
  },
  10707813: {
    name: "SCENTED CANDLE BLACK VASE H23CM",
    sku: "064299870362",
    upc_e: "10707813",
    regular_price: 19.99,
  },
};

let server;
let base;

test.before(async () => {
  server = await startServer({ port: 0 });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function lookup(code) {
  const response = await fetch(`${base}/api/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
}

test("the proxy returns one product for the three sample tag numbers", { timeout: 60_000 }, async () => {
  for (const [code, want] of Object.entries(expected)) {
    const payload = await lookup(code);
    assert.equal(payload.items.length, 1, code);
    assert.equal(payload.total_count, 1, code);
    const item = payload.items[0];
    assert.equal(item.name, want.name);
    assert.equal(item.sku, want.sku);
    assert.equal(item.upc_e, want.upc_e);
    assert.equal(item.regular_price, want.regular_price);
    assert.equal(typeof item.final_price, "number");
  }
});

test("a 13-digit code with a leading zero finds the 12-digit sku", { timeout: 30_000 }, async () => {
  const payload = await lookup("0880369836232");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].upc_e, "10707621");
  assert.equal(payload.items[0].sku, "880369836232");
});

test("BOUGIE PARFUM does not become the candle", { timeout: 30_000 }, async () => {
  const payload = await lookup("BOUGIE PARFUM");
  const candleOnly = payload.items.length === 1
    && payload.items[0].name === "SCENTED CANDLE BLACK VASE H23CM";
  assert.equal(candleOnly, false);
  assert.ok(payload.items.length !== 1);
});
