// Two-line rules from the price-tag plan. Tags stay English.
// A name with no matching rule stays blank so nothing is invented.

const SERIES = ["Amara", "Linea", "Casa", "Pro-Fit"];

const CULIN_LINE_1 = "Culin Air";
const CULIN_LINE_2 = "Digital Air Fryer 3.8 L, 1350 W";
const CANDLE_NAME = "SCENTED CANDLE BLACK VASE H23CM";
const DINNERWARE_LINE_2 = "12 pc dinner ware";

function empty() {
  return { line1: "", line2: "" };
}

function normalizeSpaces(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function thinkKitchenLines(name) {
  const match = normalizeSpaces(name).match(/^(thinkkitchen|thinkitchen)\s+(\S+)\s+(.+)$/i);
  if (!match) return null;
  const series = SERIES.find((word) => word.toLowerCase() === match[2].toLowerCase());
  if (!series) return null;
  return { line1: `T.K ${series}`, line2: match[3] };
}

function dinnerwareLines(name) {
  const match = normalizeSpaces(name).match(/^(.+?)-\s+12PC-\s+DINNERWARE$/i);
  if (!match) return null;
  return { line1: match[1].trim(), line2: DINNERWARE_LINE_2 };
}

function candleLines(name) {
  if (normalizeSpaces(name).toUpperCase() !== CANDLE_NAME) return null;
  return { line1: "SCENTED CANDLE", line2: "BLACK VASE H23CM" };
}

function isCulinAir(product) {
  if (String(product?.sku ?? "") === "880369834412") return true;
  const name = normalizeSpaces(product?.name).toLowerCase();
  if (name === "stokes 3.8l digital air fryer, 1350w") return true;
  const url = String(product?.url_key ?? "").toLowerCase();
  return url.includes("culin-air") && url.includes("3-8");
}

export function linesFor(product) {
  if (isCulinAir(product)) {
    return { line1: CULIN_LINE_1, line2: CULIN_LINE_2 };
  }
  const name = product?.name ?? "";
  return candleLines(name) || dinnerwareLines(name) || thinkKitchenLines(name) || empty();
}
