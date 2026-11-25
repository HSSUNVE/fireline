import { handleLookup } from "../../src/lookup.mjs";

export function onRequest(context) {
  return handleLookup(context.request);
}

export function POST(request) {
  return handleLookup(request);
}
