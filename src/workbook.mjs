// Fill a copy of petites-affiches.xlsx. Cell values only.
// Styles, column widths, row heights, and page setup stay in the template.

import JSZip from "jszip";

export const TAGS_PER_SHEET = 16;

/** Eight bands, left tag then right tag. Each band is four rows. */
const BAND_ROWS = [1, 5, 9, 13, 17, 21, 25, 29];

export const SLOTS = BAND_ROWS.flatMap((row) => [
  {
    line1: `A${row}`,
    line2: `A${row + 1}`,
    dollars: `B${row}`,
    cents: `C${row + 1}`,
    tag: `A${row + 3}`,
  },
  {
    line1: `D${row}`,
    line2: `D${row + 1}`,
    dollars: `E${row}`,
    cents: `F${row + 1}`,
    tag: `D${row + 3}`,
  },
]);

export function splitRegularPrice(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const [dollars, cents] = n.toFixed(2).split(".");
  return { dollars: Number(dollars), cents: Number(cents) };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function styleAttr(attrs) {
  const match = String(attrs).match(/\ss="(\d+)"/);
  return match ? ` s="${match[1]}"` : "";
}

function withCell(xml, ref, build) {
  const pattern = new RegExp(
    `<c r="${ref}"([^>]*?)/>|<c r="${ref}"([^>]*)>[\\s\\S]*?</c>`,
  );
  const match = pattern.exec(xml);
  if (!match) throw new Error(`Missing cell ${ref}`);
  const attrs = match[1] ?? match[2] ?? "";
  const next = build(styleAttr(attrs));
  return xml.slice(0, match.index) + next + xml.slice(match.index + match[0].length);
}

function emptyCell(ref, style) {
  return `<c r="${ref}"${style}/>`;
}

function textCell(ref, style, text) {
  const preserve = /^\s|\s$|\s{2,}/.test(text) ? ' xml:space="preserve"' : "";
  return `<c r="${ref}"${style} t="inlineStr"><is><t${preserve}>${escapeXml(text)}</t></is></c>`;
}

function numberCell(ref, style, value) {
  if (!Number.isSafeInteger(value)) throw new Error(`Bad number for ${ref}`);
  return `<c r="${ref}"${style}><v>${value}</v></c>`;
}

// The merged price is 38pt. Three digits use the 28pt style so they stay in the column.
function dollarStyle(style, dollars) {
  return dollars >= 100 ? ' s="225"' : style;
}

function tagNumber(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

function writeSlot(xml, slot, tag) {
  let next = xml;
  const line1 = tag?.line1 ?? "";
  const line2 = tag?.line2 ?? "";
  next = withCell(next, slot.line1, (style) =>
    line1 ? textCell(slot.line1, style, line1) : emptyCell(slot.line1, style),
  );
  next = withCell(next, slot.line2, (style) =>
    line2 ? textCell(slot.line2, style, line2) : emptyCell(slot.line2, style),
  );

  const price = tag ? splitRegularPrice(tag.regularPrice) : null;
  next = withCell(next, slot.dollars, (style) =>
    price
      ? numberCell(slot.dollars, dollarStyle(style, price.dollars), price.dollars)
      : emptyCell(slot.dollars, style),
  );
  next = withCell(next, slot.cents, (style) =>
    price
      ? textCell(slot.cents, style, String(price.cents).padStart(2, "0"))
      : emptyCell(slot.cents, style),
  );

  const code = tag ? tagNumber(tag.upc) : null;
  next = withCell(next, slot.tag, (style) =>
    code == null ? emptyCell(slot.tag, style) : numberCell(slot.tag, style, code),
  );
  return next;
}

export function fillSheetXml(sheetXml, tags) {
  let xml = sheetXml;
  for (let i = 0; i < SLOTS.length; i += 1) {
    xml = writeSlot(xml, SLOTS[i], tags[i] || null);
  }
  return xml;
}

function prepareClone(sheetXml, index) {
  if (index === 0) return sheetXml;
  const uid = `{00000000-0001-0000-0000-${String(index + 1).padStart(12, "0")}}`;
  return sheetXml
    .replace(' tabSelected="1"', "")
    .replace('xr:uid="{00000000-0001-0000-0000-000000000000}"', `xr:uid="${uid}"`);
}

function chunk(tags) {
  if (tags.length === 0) return [[]];
  const pages = [];
  for (let i = 0; i < tags.length; i += TAGS_PER_SHEET) {
    pages.push(tags.slice(i, i + TAGS_PER_SHEET));
  }
  return pages;
}

async function addSheetParts(zip, count) {
  let workbook = await zip.file("xl/workbook.xml").async("string");
  let rels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  let types = await zip.file("[Content_Types].xml").async("string");
  let app = await zip.file("docProps/app.xml").async("string");
  const relsFile = zip.file("xl/worksheets/_rels/sheet1.xml.rels");
  const sheetRels = relsFile ? await relsFile.async("string") : null;

  const sheetTags = [];
  const relationships = [];
  const overrides = [];
  const printAreas = [];
  for (let i = 1; i < count; i += 1) {
    const n = i + 1;
    const rid = `rId${5 + i}`;
    sheetTags.push(`<sheet name="Sheet${n}" sheetId="${n}" r:id="${rid}"/>`);
    relationships.push(
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`,
    );
    overrides.push(
      `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    );
    printAreas.push(
      `<definedName name="_xlnm.Print_Area" localSheetId="${i}">Sheet${n}!$A$1:$F$32</definedName>`,
    );
    if (sheetRels) zip.file(`xl/worksheets/_rels/sheet${n}.xml.rels`, sheetRels);
  }

  if (!workbook.includes("</sheets>")) throw new Error("Workbook has no sheets list");
  workbook = workbook.replace("</sheets>", `${sheetTags.join("")}</sheets>`);
  if (printAreas.length > 0) {
    if (!workbook.includes("</definedNames>")) throw new Error("Workbook has no print area");
    workbook = workbook.replace("</definedNames>", `${printAreas.join("")}</definedNames>`);
  }
  rels = rels.replace("</Relationships>", `${relationships.join("")}</Relationships>`);
  types = types.replace("</Types>", `${overrides.join("")}</Types>`);

  const titles = Array.from({ length: count }, (_, i) => `<vt:lpstr>Sheet${i + 1}</vt:lpstr>`).join("");
  const nextApp = app
    .replace("<vt:i4>1</vt:i4>", `<vt:i4>${count}</vt:i4>`)
    .replace(
      '<vt:vector size="1" baseType="lpstr"><vt:lpstr>Sheet1</vt:lpstr></vt:vector>',
      `<vt:vector size="${count}" baseType="lpstr">${titles}</vt:vector>`,
    );
  if (nextApp === app) throw new Error("Could not record the extra sheets");

  zip.file("xl/workbook.xml", workbook);
  zip.file("xl/_rels/workbook.xml.rels", rels);
  zip.file("[Content_Types].xml", types);
  zip.file("docProps/app.xml", nextApp);
}

export async function fillWorkbook(templateBuffer, tags) {
  const zip = await JSZip.loadAsync(templateBuffer);
  const templateSheet = await zip.file("xl/worksheets/sheet1.xml").async("string");
  const pages = chunk(tags);

  for (let i = 0; i < pages.length; i += 1) {
    const xml = fillSheetXml(prepareClone(templateSheet, i), pages[i]);
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, xml);
  }
  if (pages.length > 1) await addSheetParts(zip, pages.length);

  return zip.generateAsync({ type: "uint8array" });
}
