import assert from "node:assert/strict";
import test from "node:test";
import { handleLookup, lookupCode, lookupPlan } from "../src/lookup.mjs";

test("8-digit numbers are searched and a leading zero is stripped from EAN-13", () => {
  assert.deepEqual(lookupPlan("10707621"), [
    { store: "en", kind: "search", value: "10707621" },
    { store: "fr", kind: "search", value: "10707621" },
  ]);
  assert.deepEqual(lookupPlan("0880369836232"), [
    { store: "en", kind: "sku", value: "880369836232" },
    { store: "en", kind: "search", value: "880369836232" },
    { store: "fr", kind: "search", value: "880369836232" },
  ]);
  assert.deepEqual(lookupPlan("880369836232").map((step) => step.kind), ["sku", "search", "search"]);
});

function mockFetch(routes) {
  const calls = [];
  async function fetchImpl(url, options) {
    const body = JSON.parse(options.body);
    calls.push({ url, store: options.headers.Store, headers: options.headers, body });
    const key = body.variables.sku
      ? `sku:${body.variables.sku}`
      : `search:${options.headers.Store}:${body.variables.q}`;
    const items = routes[key] || [];
    return Response.json({
      data: { products: { total_count: items.length, items } },
    });
  }
  return { fetchImpl, calls };
}

const shanti = {
  name: "SHANTI- 12PC- DINNERWARE",
  sku: "880369836232",
  upc_e: "10707621",
  url_key: "shanti",
  price_range: {
    maximum_price: {
      regular_price: { value: 69.99 },
      final_price: { value: 34.98 },
    },
  },
};

test("sku hit stops before search, and French search runs only after an empty English search", async () => {
  const hit = mockFetch({ "sku:880369836232": [shanti] });
  const found = await lookupCode("880369836232", hit.fetchImpl);
  assert.equal(found.items.length, 1);
  assert.equal(found.items[0].regular_price, 69.99);
  assert.equal(found.items[0].final_price, 34.98);
  assert.equal(found.items[0].upc_e, "10707621");
  assert.deepEqual(hit.calls.map((call) => call.store), ["en"]);
  assert.equal(hit.calls[0].url, "https://www.stokesstores.com/graphql");
  assert.equal(JSON.stringify(hit.calls[0].headers).toLowerCase().includes("adobe"), false);

  const miss = mockFetch({
    "search:fr:BOUGIE PARFUM": [
      { name: "Other", sku: "1", upc_e: "10700000", price_range: { maximum_price: { regular_price: { value: 1 }, final_price: { value: 1 } } } },
      { name: "Second", sku: "2", upc_e: "10700001", price_range: { maximum_price: { regular_price: { value: 2 }, final_price: { value: 2 } } } },
    ],
  });
  const french = await lookupCode("BOUGIE PARFUM", miss.fetchImpl);
  assert.equal(french.items.length, 2);
  assert.deepEqual(miss.calls.map((call) => `${call.store}:${call.body.variables.q}`), [
    "en:BOUGIE PARFUM",
    "fr:BOUGIE PARFUM",
  ]);
  assert.equal(miss.calls.some((call) => call.body.variables.sku), false);
});

test("the route accepts one code and does not forward a client query", async () => {
  const empty = await handleLookup(new Request("http://tags.local/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ products { items { name } } }" }),
  }));
  assert.equal(empty.status, 400);

  const get = await handleLookup(new Request("http://tags.local/api/lookup"));
  assert.equal(get.status, 405);
});
