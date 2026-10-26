// Fill a copy of petites-affiches.xlsx. Cell values only.
// Styles, column widths, row heights, and page setup stay in the template.

import JSZip from "jszip";

export const TAGS_PER_SHEET = 18;

/** Left tag, then right tag, band by band. Spacer rows are not even. */
export const SLOTS = [
  { line1: "B1", line2: "B2", dollars: "C3", cents: "D3", tag: "B4" },
  { line1: "F1", line2: "F2", dollars: "G3", cents: "H3", tag: "F4" },
  { line1: "B6", line2: "B7", dollars: "C8", cents: "D8", tag: "B9" },
  { line1: "F6", line2: "F7", dollars: "G8", cents: "H8", tag: "F9" },
  { line1: "B11", line2: "B12", dollars: "C13", cents: "D13", tag: "B14" },
  { line1: "F11", line2: "F12", dollars: "G13", cents: "H13", tag: "F14" },
  { line1: "B16", line2: "B17", dollars: "C18", cents: "D18", tag: "B19" },
  { line1: "F16", line2: "F17", dollars: "G18", cents: "H18", tag: "F19" },
  { line1: "B21", line2: "B22", dollars: "C23", cents: "D23", tag: "B24" },
  { line1: "F21", line2: "F22", dollars: "G23", cents: "H23", tag: "F24" },
  { line1: "B26", line2: "B27", dollars: "C28", cents: "D28", tag: "B29" },
  { line1: "F26", line2: "F27", dollars: "G28", cents: "H28", tag: "F29" },
  { line1: "B31", line2: "B32", dollars: "C33", cents: "D33", tag: "B34" },
  { line1: "F31", line2: "F32", dollars: "G33", cents: "H33", tag: "F34" },
  { line1: "B35", line2: "B36", dollars: "C37", cents: "D37", tag: "B38" },
  { line1: "F35", line2: "F36", dollars: "G37", cents: "H37", tag: "F38" },
  { line1: "B39", line2: "B40", dollars: "C41", cents: "D41", tag: "B42" },
  { line1: "F39", line2: "F40", dollars: "G41", cents: "H41", tag: "F42" },
];

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
    price ? numberCell(slot.dollars, style, price.dollars) : emptyCell(slot.dollars, style),
  );
  next = withCell(next, slot.cents, (style) =>
    price ? numberCell(slot.cents, style, price.cents) : emptyCell(slot.cents, style),
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
  const sheetRels = await zip.file("xl/worksheets/_rels/sheet1.xml.rels").async("string");

  const sheetTags = [];
  const relationships = [];
  const overrides = [];
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
    zip.file(`xl/worksheets/_rels/sheet${n}.xml.rels`, sheetRels);
  }

  if (!workbook.includes("</sheets>")) throw new Error("Workbook has no sheets list");
  workbook = workbook.replace("</sheets>", `${sheetTags.join("")}</sheets>`);
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
