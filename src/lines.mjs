// Tag lines from the website name. A found name always fills line 1.
// Line 2 is the words that do not fit on line 1. There is no third row.

const CULIN_LINE_1 = "Culin Air";
const CULIN_LINE_2 = "Digital Air Fryer 3.8 L, 1350 W";
const CANDLE_NAME = "SCENTED CANDLE BLACK VASE H23CM";
const DINNERWARE_LINE_2 = "12 pc dinner ware";

// Column F in petites-affiches.xlsx. It is the narrower tag, so text that
// fits here also fits on the wider left tag. Excel's width is how many
// Calibri 11 digits ("0") fit in the cell.
const NARROW_COLUMN = 35.26953125;
const CALIBRI_ZERO = 1038;

// Bold Calibri 24 advances in font units. Carlito Bold uses Calibri's metrics.
// Index is the character code minus 32. 0 means the font has no such glyph.
const ADVANCE = [
  463,667,898,1020,1038,1493,1443,478,638,638,1020,1020,528,627,547,880,1038,1038,1038,1038,1038,1038,1038,1038,1038,1038,565,565,1020,1020,1020,949,1840,1241,1148,1084,1291,999,940,1305,1292,546,678,1120,866,1790,1349,1385,1090,1405,1153,968,1014,1337,1211,1856,1128,1064,979,665,880,665,1020,1020,615,1011,1099,857,1099,1031,648,971,1099,503,523,983,503,1666,1099,1101,1099,1099,728,817,710,1099,969,1526,941,970,814,704,973,704,1020,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,463,667,1020,1038,1020,1038,1020,1020,849,1709,852,1103,1020,0,1038,799,701,1020,692,688,616,1154,1224,548,621,517,891,1103,1347,1415,1437,949,1241,1241,1241,1241,1241,1241,1588,1084,999,999,999,999,546,546,546,546,1309,1349,1385,1385,1385,1385,1385,1020,1394,1337,1337,1337,1337,1064,1090,1136,1011,1011,1011,1011,1011,1011,1587,857,1031,1031,1031,1031,503,503,503,503,1099,1099,1101,1101,1101,1101,1101,1020,1114,1099,1099,1099,1099,970,1099,970,
];
const WIDE = 1856;
// Same design units as the advances above, scaled from Calibri 11 to 24 pt.
const LINE_1_LIMIT = NARROW_COLUMN * CALIBRI_ZERO * (11 / 24);

const FRENCH_PHRASES = [
  ["parfum d'intérieur", "home fragrance"],
  ["parfum d’intérieur", "home fragrance"],
  ["savon pour les mains", "hand soap"],
  ["savon à mains", "hand soap"],
  ["savon a mains", "hand soap"],
  ["liquide vaisselle", "dishwashing liquid"],
  ["fruit du dragon", "dragon fruit"],
  ["fleur de sel", "sea salt"],
  ["citron d'amalfi", "Amalfi lemon"],
  ["citron d’amalfi", "Amalfi lemon"],
  ["citron vert", "lime"],
  ["service de vaisselle", "dinnerware set"],
  ["ouvre-boîte", "Can Opener"],
  ["ouvre-boite", "Can Opener"],
  ["friteuse à air", "air fryer"],
  ["friteuse a air", "air fryer"],
  ["bougie parfum", "scented candle"],
  ["vase noir", "black vase"],
  ["parfumée au", "scented with"],
  ["parfumee au", "scented with"],
  ["parfumé au", "scented with"],
  ["parfume au", "scented with"],
  ["recharge de", "refill"],
  ["zeste de", "zest"],
  ["parfumée", "scented"],
  ["parfumee", "scented"],
  ["parfumé", "scented"],
  ["parfume", "scented"],
  ["numérique", "digital"],
  ["numerique", "digital"],
  ["coriandre", "coriander"],
  ["cyprès", "cypress"],
  ["cypres", "cypress"],
  ["bougie", "candle"],
  ["parfum", "scent"],
  ["noire", "black"],
  ["noir", "black"],
  ["blanche", "white"],
  ["blanc", "white"],
  ["savon", "soap"],
  ["vaisselle", "dishes"],
  ["mains", "hands"],
];

function normalizeSpaces(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function emptyLines() {
  return { line1: "", line2: "" };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isFrench(name) {
  if (/[àâäæçéèêëïîôœùûüÿ]/i.test(name)) return true;
  return /\b(bougie|parfum(?:ée?|e)?|ouvre-bo[iî]te|vaisselle|friteuse|savon|recharge|numérique|numerique|coriandre|cypr[eè]s|zeste|mains|noire?|blanche?)\b/i.test(name);
}

function translateFrench(name) {
  let text = name;
  const phrases = [...FRENCH_PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of phrases) {
    text = text.replace(new RegExp(escapeRegExp(from), "gi"), to);
  }
  text = text.replace(/\bet\b/gi, "and");
  text = text.replace(/\b(le|la|les|de|du|des|un|une|à|au|aux|pour)\b/gi, " ");
  text = text.replace(/\b[dl]['’]/gi, " ");
  return normalizeSpaces(text.replace(/\s+([,.;])/g, "$1"));
}

function toEnglish(name) {
  const translated = isFrench(name) ? translateFrench(name) : name;
  const match = translated.match(/^(.*?)\b(thinkkitchen|thinkitchen)\b\s*(.*)$/i);
  if (!match || !match[1].trim()) return translated;
  const brand = match[2];
  const after = match[3].trim();
  const before = match[1].trim();
  return [brand, after, before].filter(Boolean).join(" ");
}

function thinkKitchenText(name) {
  const match = name.match(/^(thinkkitchen|thinkitchen)\b\s*(.*)$/i);
  if (!match) return null;
  const rest = match[2].trim();
  return rest ? `T.K ${rest}` : "T.K";
}

function dinnerwareLines(name) {
  const match = name.match(/^(.+?)-\s+12PC-\s+DINNERWARE$/i);
  if (!match) return null;
  return { line1: match[1].trim(), line2: DINNERWARE_LINE_2 };
}

function candleLines(name) {
  if (name.toUpperCase() !== CANDLE_NAME) return null;
  return { line1: "SCENTED CANDLE", line2: "BLACK VASE H23CM" };
}

function isCulinAir(product) {
  if (String(product?.sku ?? "") === "880369834412") return true;
  const name = normalizeSpaces(product?.name).toLowerCase();
  if (name === "stokes 3.8l digital air fryer, 1350w") return true;
  const url = String(product?.url_key ?? "").toLowerCase();
  return url.includes("culin-air") && url.includes("3-8");
}

function measure(text) {
  let units = 0;
  for (const ch of text) {
    const index = ch.codePointAt(0) - 32;
    const width = index >= 0 && index < ADVANCE.length ? ADVANCE[index] : 0;
    units += width || WIDE;
  }
  return units;
}

function wrapToTag(text) {
  const words = normalizeSpaces(text).split(" ").filter(Boolean);
  if (words.length === 0) return emptyLines();
  const line = [words[0]];
  let index = 1;
  while (index < words.length) {
    const candidate = `${line.join(" ")} ${words[index]}`;
    if (measure(candidate) > LINE_1_LIMIT) break;
    line.push(words[index]);
    index += 1;
  }
  return { line1: line.join(" "), line2: words.slice(index).join(" ") };
}

export function linesFor(product) {
  if (isCulinAir(product)) {
    return { line1: CULIN_LINE_1, line2: CULIN_LINE_2 };
  }
  const raw = normalizeSpaces(product?.name);
  if (!raw) return emptyLines();
  const name = toEnglish(raw);
  return dinnerwareLines(name) || candleLines(name) || wrapToTag(thinkKitchenText(name) || name);
}
