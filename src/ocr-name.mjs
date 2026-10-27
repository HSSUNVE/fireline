// Turn lines read off a price tag into one Stokes search.

function letters(value) {
  return (value.match(/[A-Za-zÀ-ÿ]/g) || []).length;
}

function isPriceLine(line) {
  if (/^\$?\d+([.,]\d{2})?$/.test(line)) return true;
  if (!/\$?\d+[.,]\d{2}/.test(line)) return false;
  const rest = line
    .replace(/\$?\d+[.,]\d{2}/g, " ")
    .replace(/[^A-Za-zÀ-ÿ]+/g, " ")
    .trim();
  return /^(?:r[eé]g(?:ular|ulier)?|sale|prix|final|sp[eé]cial|our)?(?:\s+price)?$/i.test(rest);
}

function skipLine(line) {
  if (letters(line) < 3) return true;
  if (/^stokes(\s+stores)?$/i.test(line)) return true;
  if (isPriceLine(line)) return true;
  const compact = line.replace(/[\s$.-]/g, "");
  if (/^\d{6,}$/.test(compact)) return true;
  return false;
}

export function nameFromOcrLines(lines) {
  const kept = [];
  for (const raw of lines || []) {
    const line = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!line || skipLine(line)) continue;
    kept.push(line);
  }
  return kept.join(" ").replace(/\s+/g, " ").slice(0, 120);
}
