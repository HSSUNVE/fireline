import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const client = readFileSync(new URL("../src/client.mjs", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const workbook = readFileSync(new URL("../src/workbook.mjs", import.meta.url), "utf8");

test("the phone page does not call Stokes or set workbook layout", () => {
  for (const source of [client, html]) {
    assert.equal(source.includes("stokesstores.com"), false);
    assert.equal(source.includes("adobe.io"), false);
    assert.equal(source.includes("tesseract"), false);
  }
  assert.equal(workbook.includes("Calibri"), false);
  assert.equal(workbook.includes("pageSetup"), false);
  assert.equal(workbook.includes("customWidth"), false);
  assert.equal(workbook.includes("ht="), false);
  assert.match(client, /\/api\/lookup/);
});
