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
  assert.equal(sha(after["xl/workbook.xml"]), sha(before["xl/workbook.xml"]));
  assert.equal(sha(after["docProps/app.xml"]), sha(before["docProps/app.xml"]));
  assert.equal(after["xl/worksheets/sheet2.xml"], undefined);

  assert.equal(sheet.match(/<cols>[\s\S]*?<\/cols>/)[0], original.match(/<cols>[\s\S]*?<\/cols>/)[0]);
  assert.equal(sheet.match(/<pageMargins[^/]*\/>/)[0], original.match(/<pageMargins[^/]*\/>/)[0]);
  assert.equal(sheet.match(/<pageSetup[^/]*\/>/)[0], original.match(/<pageSetup[^/]*\/>/)[0]);
  assert.equal(sheet.match(/<mergeCells[\s\S]*?<\/mergeCells>/)[0], original.match(/<mergeCells[\s\S]*?<\/mergeCells>/)[0]);
  assert.equal((sheet.match(/<row /g) || []).length, 32);
  assert.equal(sheet.includes('ht="29.25"'), true);
  assert.equal(sheet.includes('ht="58.5"'), false);

  assert.deepEqual(fontFor(sheet, styles, "A1"), { bold: true, size: 18, name: "Arial" });
  assert.deepEqual(fontFor(sheet, styles, "A2"), { bold: false, size: 11, name: "Calibri" });
  assert.deepEqual(fontFor(sheet, styles, "B1"), { bold: false, size: 38, name: "Arial Black" });
  assert.deepEqual(fontFor(sheet, styles, "C2"), { bold: false, size: 14, name: "Arial Black" });
  assert.deepEqual(fontFor(sheet, styles, "D1"), { bold: true, size: 18, name: "Arial" });
  assert.deepEqual(fontFor(sheet, styles, "A4"), { bold: false, size: 11, name: "Calibri" });

  assert.equal(cell(sheet, "A1").includes('s="21"') && cell(sheet, "A1").includes("SHANTI"), true);
  assert.equal(cell(sheet, "A2").includes("12 pc dinner ware"), true);
  assert.equal(cell(sheet, "B1"), '<c r="B1" s="217"><v>69</v></c>');
  assert.equal(cell(sheet, "C2"), '<c r="C2" s="11" t="inlineStr"><is><t>99</t></is></c>');
  assert.equal(cell(sheet, "A4"), '<c r="A4" s="25"><v>10707621</v></c>');
  assert.equal(cell(sheet, "D1").includes("GREEN SYLVA"), true);
  assert.equal(cell(sheet, "E1"), '<c r="E1" s="217"><v>39</v></c>');
  assert.equal(cell(sheet, "F2"), '<c r="F2" s="16" t="inlineStr"><is><t>99</t></is></c>');
  assert.equal(cell(sheet, "A5").includes("SCENTED"), true);
  assert.equal(cell(sheet, "A6").includes("CANDLE BLACK VASE H23CM"), true);
  assert.equal(cell(sheet, "B5"), '<c r="B5" s="217"><v>19</v></c>');
  assert.equal(cell(sheet, "C6"), '<c r="C6" s="11" t="inlineStr"><is><t>99</t></is></c>');
  assert.equal(cell(sheet, "A8"), '<c r="A8" s="25"><v>10707813</v></c>');
  assert.equal(cell(sheet, "D29"), '<c r="D29" s="21"/>');
  assert.equal(cell(sheet, "E29"), '<c r="E29" s="217"/>');
  assert.equal(cell(sheet, "A3"), '<c r="A3" s="24"/>');

  assert.equal(sheet.includes("12MCX"), false);
  assert.equal(sheet.includes("BOUGIE"), false);
  assert.equal(sheet.includes("34.98"), false);
  assert.equal(sheet.includes("<v>34</v>"), false);
  assert.equal(sheet.includes("<v>98</v>"), false);
  assert.equal(sheet.includes('t="s"'), false);

  for (const slot of SLOTS) {
    assert.match(cell(sheet, slot.line1), new RegExp(`<c r="${slot.line1}" s="21"`));
    assert.match(cell(sheet, slot.line2), new RegExp(`<c r="${slot.line2}" s="23"`));
  }
});

test("more than 16 tags adds a sheet cloned from the template", async () => {
  const tags = Array.from({ length: 17 }, (_, index) => ({
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
  const workbook = text(after["xl/workbook.xml"]);

  assert.equal(sha(after["xl/styles.xml"]), sha(before["xl/styles.xml"]));
  assert.equal(sheet2.match(/<cols>[\s\S]*?<\/cols>/)[0], original.match(/<cols>[\s\S]*?<\/cols>/)[0]);
  assert.equal(sheet2.match(/<pageSetup[^/]*\/>/)[0], original.match(/<pageSetup[^/]*\/>/)[0]);
  assert.equal(sheet2.match(/<pageMargins[^/]*\/>/)[0], original.match(/<pageMargins[^/]*\/>/)[0]);
  assert.equal(sheet2.match(/<mergeCells[\s\S]*?<\/mergeCells>/)[0], original.match(/<mergeCells[\s\S]*?<\/mergeCells>/)[0]);
  assert.equal(sheet2.includes('ht="29.25"'), true);
  assert.equal(cell(sheet2, "A1").includes('s="21"') && cell(sheet2, "A1").includes("L1-17"), true);
  assert.equal(cell(sheet2, "A2").includes('s="23"') && cell(sheet2, "A2").includes("L2-17"), true);
  assert.equal(cell(sheet2, "B1"), '<c r="B1" s="217"><v>26</v></c>');
  assert.equal(cell(sheet2, "C2"), '<c r="C2" s="11" t="inlineStr"><is><t>25</t></is></c>');
  assert.equal(cell(sheet2, "D1"), '<c r="D1" s="21"/>');
  assert.equal(sheet2.includes("BOUGIE"), false);
  assert.equal(sheet1.includes("L1-17"), false);
  assert.match(workbook, /name="Sheet2"/);
  assert.match(workbook, /localSheetId="1">Sheet2!\$A\$1:\$F\$32/);
  assert.equal(workbook.includes("Sheet3"), false);
});

test("a three-digit dollar amount uses the smaller price style", async () => {
  const out = await fillWorkbook(template, [
    { line1: "BIG", line2: "ITEM", regularPrice: 129.5, upc: "10700001" },
  ]);
  const sheet = text((await files(out))["xl/worksheets/sheet1.xml"]);
  assert.equal(cell(sheet, "B1"), '<c r="B1" s="225"><v>129</v></c>');
  assert.equal(cell(sheet, "C2"), '<c r="C2" s="11" t="inlineStr"><is><t>50</t></is></c>');
});
