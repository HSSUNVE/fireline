// Tag lines from the website name. A found name always fills line 1.
// Line 2 is the words that do not fit on line 1. There is no third row.

const CULIN_LINE_1 = "Culin Air";
const CULIN_LINE_2 = "Digital Air Fryer 3.8 L, 1350 W";
const DINNERWARE_LINE_2 = "12 pc dinner ware";

// Column D is the narrower description. Its width is 209px. Line 1 is Arial
// Bold 18. These advances are Liberation Sans Bold, which matches Arial.
// Index is the character code minus 32. 0 means the font has no such glyph.
const ADVANCE = [
  569,682,971,1139,1139,1821,1479,487,682,682,797,1196,569,682,569,569,1139,1139,1139,1139,1139,1139,1139,1139,1139,1139,682,682,1196,1196,1196,1251,1997,1479,1479,1479,1479,1366,1251,1593,1479,569,1139,1479,1251,1706,1479,1593,1366,1593,1479,1366,1251,1479,1366,1933,1366,1366,1251,682,569,682,1196,1139,682,1139,1251,1139,1251,1139,682,1251,1251,569,569,1139,569,1821,1251,1251,1251,1251,797,1139,682,1251,1139,1593,1139,1139,1024,797,573,797,1196,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,569,682,1139,1139,1139,1139,573,1139,682,1509,758,1139,1196,682,1509,1131,819,1124,682,682,682,1180,1139,682,682,682,748,1139,1708,1708,1708,1251,1479,1479,1479,1479,1479,1479,2048,1479,1366,1366,1366,1366,569,569,569,569,1479,1479,1593,1593,1593,1593,1593,1196,1593,1479,1479,1479,1479,1366,1366,1251,1139,1139,1139,1139,1139,1139,1821,1139,1139,1139,1139,1139,569,569,569,569,1251,1251,1251,1251,1251,1251,1251,1124,1251,1251,1251,1251,1251,1139,1251,1139,
];
const WIDE = 2048;
// 18pt at 96dpi, minus the cell padding, in the font's own units.
const LINE_1_LIMIT = ((209 - 8) * 2048) / 24;

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
  return dinnerwareLines(name) || wrapToTag(thinkKitchenText(name) || name);
}
