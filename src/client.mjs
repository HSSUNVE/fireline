import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { linesFor } from "./lines.mjs";
import { TAGS_PER_SHEET, fillWorkbook } from "./workbook.mjs";

const STORAGE_KEY = "stokes-price-tags-v1";
const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
];

const codeInput = document.querySelector("#code");
const lookupButton = document.querySelector("#lookup");
const cameraButton = document.querySelector("#camera");
const statusEl = document.querySelector("#status");
const matchEl = document.querySelector("#match");
const pickerEl = document.querySelector("#picker");
const matchCard = document.querySelector("#match-card");
const listEl = document.querySelector("#list-items");
const countEl = document.querySelector("#count");
const downloadButton = document.querySelector("#download");
const emptyEl = document.querySelector("#empty");

let list = loadList();
let scanner = null;
let cameraOn = false;
let busy = false;
let current = null;

function loadList() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object");
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    setStatus("This browser did not keep the list.");
  }
}

function setStatus(text) {
  statusEl.textContent = text || "";
}

function money(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(2);
}

function selectedTags() {
  return list.filter((item) => item.selected);
}

function updateCount() {
  const selected = selectedTags();
  const sheets = selected.length === 0 ? 0 : Math.ceil(selected.length / TAGS_PER_SHEET);
  if (selected.length === 0) {
    countEl.textContent = "Tick the tags to print.";
  } else if (sheets === 1) {
    countEl.textContent = `${selected.length} tag${selected.length === 1 ? "" : "s"} on 1 sheet.`;
  } else {
    countEl.textContent = `${selected.length} tags on ${sheets} sheets, ${TAGS_PER_SHEET} per sheet.`;
  }
  emptyEl.hidden = list.length > 0;
}

async function lookup(code) {
  const response = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload.error || "Lookup failed.");
  }
  return payload;
}

function showMatch(product) {
  current = product;
  const lines = linesFor(product);
  matchCard.hidden = false;
  pickerEl.hidden = true;
  pickerEl.replaceChildren();
  matchEl.hidden = false;

  matchCard.querySelector('[data-field="name"]').textContent = product.name || "Unnamed product";
  matchCard.querySelector('[data-field="sku"]').textContent = product.sku || "—";
  matchCard.querySelector('[data-field="upc"]').textContent = product.upc_e || "—";
  matchCard.querySelector('[data-field="regular"]').textContent = money(product.regular_price);
  matchCard.querySelector('[data-field="final"]').textContent = money(product.final_price);
  const line1 = matchCard.querySelector('[data-field="line1"]');
  const line2 = matchCard.querySelector('[data-field="line2"]');
  line1.value = lines.line1;
  line2.value = lines.line2;
  const hint = matchCard.querySelector('[data-field="hint"]');
  hint.hidden = Boolean(lines.line1 || lines.line2);
  matchEl.scrollIntoView({ block: "nearest" });
}

function showPicker(items, total) {
  current = null;
  matchCard.hidden = true;
  matchEl.hidden = false;
  pickerEl.hidden = false;
  pickerEl.replaceChildren();
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = total > items.length
    ? `Showing ${items.length} of ${total}. Type the barcode or the 8-digit number.`
    : "Several products matched. Choose one.";
  pickerEl.append(note);
  for (const product of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pick";
    const name = document.createElement("strong");
    name.textContent = product.name || "Unnamed product";
    const meta = document.createElement("span");
    meta.textContent = `${product.sku || "—"} · ${product.upc_e || "—"} · Regular ${money(product.regular_price)} · Final ${money(product.final_price)}`;
    button.append(name, meta);
    button.addEventListener("click", () => showMatch(product));
    pickerEl.append(button);
  }
  matchEl.scrollIntoView({ block: "nearest" });
}

async function runLookup(code) {
  const trimmed = code.trim();
  if (!trimmed) {
    setStatus("Enter a barcode or an 8-digit number.");
    return;
  }
  lookupButton.disabled = true;
  setStatus("Looking up…");
  matchEl.hidden = true;
  try {
    const result = await lookup(trimmed);
    const items = Array.isArray(result.items) ? result.items : [];
    const total = Number.isFinite(Number(result.total_count)) ? Number(result.total_count) : items.length;
    if (items.length === 0 || total === 0) {
      setStatus("No product found.");
      return;
    }
    if (total !== 1) {
      setStatus("");
      showPicker(items, total);
      return;
    }
    setStatus("");
    showMatch(items[0]);
  } catch (error) {
    setStatus(error.message || "Lookup failed.");
  } finally {
    lookupButton.disabled = false;
  }
}

function saveCurrent() {
  if (!current) return;
  const line1 = matchCard.querySelector('[data-field="line1"]').value;
  const line2 = matchCard.querySelector('[data-field="line2"]').value;
  list.push({
    id: crypto.randomUUID(),
    name: current.name || "",
    sku: current.sku || "",
    upc_e: current.upc_e || "",
    regular_price: current.regular_price,
    final_price: current.final_price,
    url_key: current.url_key || "",
    line1,
    line2,
    selected: true,
  });
  persist();
  renderList();
  setStatus("Saved on this phone.");
  document.querySelector("#list").scrollIntoView({ block: "nearest" });
}

function renderList() {
  listEl.replaceChildren();
  for (const item of list) {
    const row = document.createElement("article");
    row.className = "tag";

    const head = document.createElement("div");
    head.className = "tag-head";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = Boolean(item.selected);
    check.setAttribute("aria-label", `Print ${item.name || "tag"}`);
    check.addEventListener("change", () => {
      item.selected = check.checked;
      persist();
      updateCount();
    });
    const name = document.createElement("h3");
    name.textContent = item.name || "Unnamed product";
    head.append(check, name);

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `Barcode ${item.sku || "—"} · Tag ${item.upc_e || "—"}`;

    const prices = document.createElement("p");
    prices.className = "prices";
    const regular = document.createElement("span");
    regular.textContent = `Regular ${money(item.regular_price)}`;
    const finalPrice = document.createElement("span");
    finalPrice.textContent = `Final ${money(item.final_price)}`;
    prices.append(regular, finalPrice);

    const line1 = field("Line 1", item.line1, (value) => {
      item.line1 = value;
      persist();
    });
    const line2 = field("Line 2", item.line2, (value) => {
      item.line2 = value;
      persist();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      list = list.filter((entry) => entry.id !== item.id);
      persist();
      renderList();
    });

    row.append(head, meta, prices, line1, line2, remove);
    listEl.append(row);
  }
  updateCount();
}

function field(labelText, value, onInput) {
  const label = document.createElement("label");
  label.className = "line";
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.maxLength = 80;
  input.autocomplete = "off";
  input.addEventListener("input", () => onInput(input.value));
  label.append(span, input);
  return label;
}

async function stopCamera() {
  cameraOn = false;
  cameraButton.textContent = "Start camera";
  if (!scanner) return;
  const currentScanner = scanner;
  scanner = null;
  try {
    if (currentScanner.isScanning) await currentScanner.stop();
    currentScanner.clear();
  } catch {
    // The camera is already stopped.
  }
}

async function startCamera() {
  if (cameraOn) {
    await stopCamera();
    return;
  }
  if (!window.isSecureContext) {
    setStatus("The camera needs HTTPS. On this computer, use localhost. On the phone, use the HTTPS site.");
    return;
  }
  try {
    scanner = new Html5Qrcode("reader", { formatsToSupport: FORMATS, verbose: false });
    await scanner.start(
      { facingMode: "environment" },
      { fps: 8, qrbox: { width: 240, height: 120 } },
      (text) => {
        void onDecoded(text);
      },
      () => {},
    );
    cameraOn = true;
    cameraButton.textContent = "Stop camera";
    setStatus("");
  } catch {
    await stopCamera();
    setStatus("The camera did not start. Type the barcode or the 8-digit number.");
  }
}

async function onDecoded(text) {
  if (busy) return;
  busy = true;
  try {
    await stopCamera();
    codeInput.value = text;
    await runLookup(text);
  } finally {
    busy = false;
  }
}

async function downloadWorkbook() {
  const tags = selectedTags().map((item) => ({
    line1: item.line1 || "",
    line2: item.line2 || "",
    regularPrice: item.regular_price,
    upc: item.upc_e || "",
  }));
  if (tags.length === 0) {
    setStatus("Tick the tags to print.");
    return;
  }
  downloadButton.disabled = true;
  setStatus("Building the workbook…");
  try {
    const response = await fetch("/petites-affiches.xlsx");
    if (!response.ok) throw new Error("missing template");
    const bytes = await fillWorkbook(await response.arrayBuffer(), tags);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "petites-affiches.xlsx";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded petites-affiches.xlsx. It prints the regular price.");
  } catch {
    setStatus("Could not build the workbook.");
  } finally {
    downloadButton.disabled = false;
  }
}

lookupButton.addEventListener("click", () => {
  void runLookup(codeInput.value);
});
codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void runLookup(codeInput.value);
  }
});
cameraButton.addEventListener("click", () => {
  void startCamera();
});
matchCard.querySelector("#save").addEventListener("click", saveCurrent);
downloadButton.addEventListener("click", () => {
  void downloadWorkbook();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) void stopCamera();
});

renderList();
