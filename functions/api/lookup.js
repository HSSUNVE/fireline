import { handleLookup } from "../../src/lookup.mjs";

export function onRequest(context) {
  return handleLookup(context.request);
}
