import { handleLookup } from "../src/lookup.mjs";

export function POST(request) {
  return handleLookup(request);
}
