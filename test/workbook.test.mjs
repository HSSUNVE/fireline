import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { linesFor } from "../src/lines.mjs";
import { SLOTS, fillWorkbook, splitRegularPrice } from "../src/workbook.mjs";

const template = readFileSync(new URL("../template/petites-affiches.xlsx", import.meta.url));

function sha(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function files(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const out = {};
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    out[name] = await zip.files[name].async("uint8array");
  }
  return out;
}

function text(bytes) {
  return new TextDecoder().decode(bytes);
}

function cell(sheet, ref) {
  const match = sheet.match(new RegExp(`<c r="${ref}"(?:\\s[^>]*?)?/>|<c r="${ref}"(?:\\s[^>]*)?>[\\s\\S]*?</c>`));
  assert.ok(match, ref);
  return match[0];
}

function fontsOf(styles) {
  const block = styles.match(/<fonts[^>]*>([\s\S]*?)<\/fonts>/)[1];
  return [...block.matchAll(/<font>([\s\S]*?)<\/font>/g)].map((match) => ({
    bold: /<b\/>/.test(match[1]),
    size: Number(match[1].match(/<sz val="([^"]+)"/)[1]),
    name: match[1].match(/<name val="([^"]+)"/)[1],
  }));
}

function fontFor(sheet, styles, ref) {
  const styleId = Number(cell(sheet, ref).match(/\ss="(\d+)"/)[1]);
  const xfs = styles.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)[1];
  const xf = [...xfs.matchAll(/<xf\b[^>]*>/g)][styleId][0];
  const fontId = Number(xf.match(/fontId="(\d+)"/)[1]);
  return fontsOf(styles)[fontId];
}

function tag(product) {
  const lines = linesFor(product);
  return {
    line1: lines.line1,
    line2: lines.line2,
    regularPrice: product.regular_price,
    upc: product.upc_e,
  };
}

const products = [
  tag({ name: "SHANTI- 12PC- DINNERWARE", regular_price: 69.99, final_price: 34.98, upc_e: "10707621" }),
  tag({ name: "GREEN SYLVA- 12PC- DINNERWARE", regular_price: 39.99, final_price: 39.99, upc_e: "10707620" }),
  tag({ name: "SCENTED CANDLE BLACK VASE H23CM", regular_price: 19.99, final_price: 19.99, upc_e: "10707813" }),
];

test("splits the regular price into dollar and cent numbers", () => {
  assert.deepEqual(splitRegularPrice(69.99), { dollars: 69, cents: 99 });
  assert.deepEqual(splitRegularPrice("10"), { dollars: 10, cents: 0 });
  assert.equal(splitRegularPrice(null), null);
});

test("a filled sheet keeps template fonts and writes regular price only", async () => {
  const before = await files(template);
  const out = await fillWorkbook(template, products);
  const after = await files(out);
  const styles = text(after["xl/styles.xml"]);
  const sheet = text(after["xl/worksheets/sheet1.xml"]);
  const original = text(before["xl/worksheets/sheet1.xml"]);

  assert.equal(sha(after["xl/styles.xml"]), sha(before["xl/styles.xml"]));
  assert.equal(sha(after["xl/sharedStrings.xml"]), sha(before["xl/sharedStrings.xml"]));
  assert.equal(sha(after["xl/printerSettings/printerSettings1.bin"]), sha(before["xl/printerSettings/printerSettings1.bin"]));
  assert.equal(sha(after["xl/workbook.xml"]), sha(before["xl/workbook.xml"]));
  assert.equal(sha(after["docProps/app.xml"]), sha(before["docProps/app.xml"]));
  assert.equal(after["xl/worksheets/sheet2.xml"], undefined);

  assert.equal(sheet.match(/<cols>[\s\S]*?<\/cols>/)[0], original.match(/<cols>[\s\S]*?<\/cols>/)[0]);
  assert.equal(sheet.match(/<pageMargins[^/]*\/>/)[0], original.match(/<pageMargins[^/]*\/>/)[0]);
  assert.equal(sheet.match(/<pageSetup[^/]*\/>/)[0], original.match(/<pageSetup[^/]*\/>/)[0]);
  assert.equal(sheet.includes('fitToPage="1"'), true);
  assert.equal((sheet.match(/<row /g) || []).length, (original.match(/<row /g) || []).length);

  assert.deepEqual(fontFor(sheet, styles, "B1"), { bold: true, size: 24, name: "Calibri" });
  assert.deepEqual(fontFor(sheet, styles, "B2"), { bold: false, size: 11, name: "Calibri" });
  assert.deepEqual(fontFor(sheet, styles, "F1"), { bold: true, size: 24, name: "Calibri" });
  assert.deepEqual(fontFor(sheet, styles, "F2"), { bold: false, size: 11, name: "Calibri" });

  assert.equal(cell(sheet, "B1").includes('s="11"') && cell(sheet, "B1").includes("SHANTI"), true);
  assert.equal(cell(sheet, "B2").includes("12 pc dinner ware"), true);
  assert.equal(cell(sheet, "C3"), '<c r="C3" s="13"><v>69</v></c>');
  assert.equal(cell(sheet, "D3"), '<c r="D3" s="9"><v>99</v></c>');
  assert.equal(cell(sheet, "B4"), '<c r="B4" s="12"><v>10707621</v></c>');
  assert.equal(cell(sheet, "F1").includes("GREEN SYLVA"), true);
  assert.equal(cell(sheet, "G3"), '<c r="G3" s="13"><v>39</v></c>');
  assert.equal(cell(sheet, "C8"), '<c r="C8" s="8"><v>19</v></c>');
  assert.equal(cell(sheet, "B6").includes("SCENTED CANDLE"), true);
  assert.equal(cell(sheet, "B7").includes("BLACK VASE H23CM"), true);
  assert.equal(cell(sheet, "B9"), '<c r="B9" s="14"><v>10707813</v></c>');
  assert.equal(cell(sheet, "B34"), '<c r="B34" s="10"/>');
  assert.equal(cell(sheet, "F24"), '<c r="F24" s="12"/>');
  assert.equal(cell(sheet, "B3"), '<c r="B3" s="3"/>');

  assert.equal(sheet.includes("12MCX"), false);
  assert.equal(sheet.includes("BOUGIE"), false);
  assert.equal(sheet.includes("34.98"), false);
  assert.equal(sheet.includes("<v>34</v>"), false);
  assert.equal(sheet.includes("<v>98</v>"), false);
  assert.equal(sheet.includes('t="s"'), false);

  for (const slot of SLOTS) {
    assert.match(cell(sheet, slot.line1), new RegExp(`<c r="${slot.line1}" s="11"`));
    assert.match(cell(sheet, slot.line2), new RegExp(`<c r="${slot.line2}" s="7"`));
  }
});

test("more than 18 tags adds a sheet cloned from the template", async () => {
  const tags = Array.from({ length: 19 }, (_, index) => ({
    line1: `L1-${index + 1}`,
    line2: `L2-${index + 1}`,
    regularPrice: 10 + index + 0.25,
    upc: String(10700000 + index),
  }));
  const before = await files(template);
  const after = await files(await fillWorkbook(template, tags));
  const sheet1 = text(after["xl/worksheets/sheet1.xml"]);
  const sheet2 = text(after["xl/worksheets/sheet2.xml"]);
  const original = text(before["xl/worksheets/sheet1.xml"]);

  assert.equal(sha(after["xl/styles.xml"]), sha(before["xl/styles.xml"]));
  assert.equal(sha(after["xl/printerSettings/printerSettings1.bin"]), sha(before["xl/printerSettings/printerSettings1.bin"]));
  assert.equal(text(after["xl/worksheets/_rels/sheet2.xml.rels"]), text(before["xl/worksheets/_rels/sheet1.xml.rels"]));
  assert.equal(sheet2.match(/<cols>[\s\S]*?<\/cols>/)[0], original.match(/<cols>[\s\S]*?<\/cols>/)[0]);
  assert.equal(sheet2.match(/<pageSetup[^/]*\/>/)[0], original.match(/<pageSetup[^/]*\/>/)[0]);
  assert.equal(sheet2.includes('ht="30.5"'), true);
  assert.equal(cell(sheet2, "B1").includes('s="11"') && cell(sheet2, "B1").includes("L1-19"), true);
  assert.equal(cell(sheet2, "B2").includes('s="7"') && cell(sheet2, "B2").includes("L2-19"), true);
  assert.equal(cell(sheet2, "C3"), '<c r="C3" s="13"><v>28</v></c>');
  assert.equal(cell(sheet2, "D3"), '<c r="D3" s="9"><v>25</v></c>');
  assert.equal(cell(sheet2, "F1"), '<c r="F1" s="11"/>');
  assert.equal(sheet2.includes("BOUGIE"), false);
  assert.equal(sheet1.includes("L1-19"), false);
  assert.match(text(after["xl/workbook.xml"]), /name="Sheet2"/);
  assert.equal(text(after["xl/workbook.xml"]).includes("Sheet3"), false);
});
