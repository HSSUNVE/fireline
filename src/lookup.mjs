// One product at a time. The phone calls this module through /api/lookup.
// This file is the only place that talks to Stokes. No Adobe catalog key.

const ENDPOINT = "https://www.stokesstores.com/graphql";

const ITEM_FIELDS = `
  name
  sku
  upc_e
  url_key
  price_range {
    maximum_price {
      regular_price { value }
      final_price { value }
    }
  }
`;

const SKU_QUERY = `query LookupSku($sku: String!) {
  products(filter: { sku: { eq: $sku } }) {
    items { ${ITEM_FIELDS} }
  }
}`;

const SEARCH_QUERY = `query LookupSearch($q: String!) {
  products(search: $q, pageSize: 20) {
    total_count
    items { ${ITEM_FIELDS} }
  }
}`;

export function lookupPlan(code) {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) return [];

  const digits = trimmed.replace(/\s+/g, "");
  const numeric = /^\d+$/.test(digits);
  const steps = [];
  let searchValue = trimmed;

  if (numeric && digits.length === 13 && digits.startsWith("0")) {
    const sku = digits.slice(1);
    steps.push({ store: "en", kind: "sku", value: sku });
    searchValue = sku;
  } else if (numeric && digits.length !== 8) {
    steps.push({ store: "en", kind: "sku", value: digits });
    searchValue = digits;
  } else if (numeric) {
    searchValue = digits;
  }

  steps.push({ store: "en", kind: "search", value: searchValue });
  steps.push({ store: "fr", kind: "search", value: searchValue });
  return steps;
}

function asNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapItem(item) {
  const max = item?.price_range?.maximum_price;
  return {
    name: item?.name ?? "",
    sku: item?.sku == null ? "" : String(item.sku),
    upc_e: item?.upc_e == null ? "" : String(item.upc_e),
    regular_price: asNumber(max?.regular_price?.value),
    final_price: asNumber(max?.final_price?.value),
    url_key: item?.url_key == null ? "" : String(item.url_key),
  };
}

async function runStep(step, fetchImpl) {
  const query = step.kind === "sku" ? SKU_QUERY : SEARCH_QUERY;
  const variables = step.kind === "sku" ? { sku: step.value } : { q: step.value };
  const response = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Store: step.store,
    },
    body: JSON.stringify({ query, variables }),
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Store lookup returned HTTP ${response.status}`);
  }
  const body = await response.json();
  const products = body?.data?.products;
  if (!products && body?.errors?.length) {
    throw new Error("Store lookup failed");
  }
  const items = Array.isArray(products?.items) ? products.items.map(mapItem) : [];
  const total = Number(products?.total_count);
  return {
    items,
    total_count: Number.isFinite(total) ? total : items.length,
  };
}

export async function lookupCode(code, fetchImpl = globalThis.fetch) {
  const steps = lookupPlan(code);
  if (steps.length === 0) return { items: [], total_count: 0 };

  for (const step of steps) {
    const result = await runStep(step, fetchImpl);
    if (result.items.length > 0) return result;
  }
  return { items: [], total_count: 0 };
}

export async function handleLookup(request, deps = {}) {
  if (request.method !== "POST") {
    return Response.json({ error: "POST a barcode or an 8-digit number." }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send JSON with a code." }, { status: 400 });
  }

  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  if (!code || code.length > 80) {
    return Response.json(
      { error: "Enter one barcode or one 8-digit number." },
      { status: 400 },
    );
  }

  try {
    const lookup = deps.lookupCode || lookupCode;
    const result = await lookup(code);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "The store lookup did not answer. Try the code again." },
      { status: 502 },
    );
  }
}
