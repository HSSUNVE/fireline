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
const tableWrap = document.querySelector("#table-wrap");
const countEl = document.querySelector("#count");
const downloadButton = document.querySelector("#download");
const deleteAllButton = document.querySelector("#delete-all");
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

function updateCount() {
  const count = list.length;
  const sheets = count === 0 ? 0 : Math.ceil(count / TAGS_PER_SHEET);
  if (count === 0) {
    countEl.textContent = "No saved tags.";
  } else if (sheets === 1) {
    countEl.textContent = `${count} tag${count === 1 ? "" : "s"} on 1 sheet.`;
  } else {
    countEl.textContent = `${count} tags on ${sheets} sheets, ${TAGS_PER_SHEET} per sheet.`;
  }
  emptyEl.hidden = count > 0;
  tableWrap.hidden = count === 0;
  deleteAllButton.disabled = count === 0;
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

function productImage(product) {
  const raw = typeof product?.image === "string" ? product.image.trim() : "";
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function addProduct(product, lines) {
  const filled = lines || linesFor(product);
  list.push({
    id: crypto.randomUUID(),
    name: product.name || "",
    sku: product.sku || "",
    upc_e: product.upc_e || "",
    regular_price: product.regular_price,
    final_price: product.final_price,
    url_key: product.url_key || "",
    image: productImage(product),
    line1: filled.line1,
    line2: filled.line2,
  });
  persist();
  renderList();
  setStatus("Saved on this phone.");
}

function showMatch(product) {
  current = product;
  const lines = linesFor(product);
  matchCard.hidden = false;
  pickerEl.hidden = true;
  pickerEl.replaceChildren();
  matchEl.hidden = false;

  const photo = matchCard.querySelector('[data-field="image"]');
  const image = productImage(product);
  if (image) {
    photo.src = image;
    photo.alt = product.name || "Product photo";
    photo.hidden = false;
  } else {
    photo.removeAttribute("src");
    photo.alt = "";
    photo.hidden = true;
  }
  matchCard.querySelector('[data-field="name"]').textContent = product.name || "Unnamed product";
  matchCard.querySelector('[data-field="sku"]').textContent = product.sku || "—";
  matchCard.querySelector('[data-field="upc"]').textContent = product.upc_e || "—";
  matchCard.querySelector('[data-field="regular"]').textContent = money(product.regular_price);
  matchCard.querySelector('[data-field="final"]').textContent = money(product.final_price);
  const line1 = matchCard.querySelector('[data-field="line1"]');
  const line2 = matchCard.querySelector('[data-field="line2"]');
  line1.value = lines.line1;
  line2.value = lines.line2;
  matchEl.scrollIntoView({ block: "nearest" });
}

function pickerRow(product) {
  const row = document.createElement("article");
  row.className = "pick";
  const image = productImage(product);
  if (image) {
    const photo = document.createElement("img");
    photo.src = image;
    photo.alt = product.name || "Product photo";
    row.append(photo);
  } else {
    const blank = document.createElement("span");
    blank.className = "no-photo";
    blank.textContent = "No photo";
    row.append(blank);
  }

  const copy = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = product.name || "Unnamed product";
  const meta = document.createElement("span");
  meta.textContent = `${product.sku || "—"} · ${product.upc_e || "—"} · Regular ${money(product.regular_price)} · Final ${money(product.final_price)}`;
  const lines = linesFor(product);
  const preview = document.createElement("span");
  preview.className = "lines-preview";
  preview.textContent = lines.line2 ? `${lines.line1} / ${lines.line2}` : lines.line1;

  const actions = document.createElement("div");
  actions.className = "pick-actions";
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "Add";
  add.addEventListener("click", () => {
    addProduct(product, lines);
    add.disabled = true;
    add.textContent = "Added";
  });
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "skip";
  skip.textContent = "Skip";
  skip.addEventListener("click", () => {
    row.remove();
    if (!pickerEl.querySelector(".pick")) {
      pickerEl.hidden = true;
      if (matchCard.hidden) matchEl.hidden = true;
      setStatus("Skipped.");
    }
  });
  actions.append(add, skip);
  copy.append(name, meta, preview, actions);
  row.append(copy);
  return row;
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
    ? `Showing ${items.length} of ${total}. Add one, or skip it.`
    : "Several products matched. Add one, or skip it.";
  pickerEl.append(note);
  for (const product of items) pickerEl.append(pickerRow(product));
  matchEl.scrollIntoView({ block: "nearest" });
}

function skipMatch() {
  current = null;
  matchCard.hidden = true;
  if (!pickerEl.hidden && pickerEl.querySelector(".pick")) return;
  pickerEl.hidden = true;
  matchEl.hidden = true;
}

async function runLookup(code) {
  const trimmed = code.trim();
  if (!trimmed) {
    setStatus("Enter a barcode, an 8-digit number, or a product name.");
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
    if (items.length !== 1 || total !== 1) {
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
    image: productImage(current),
    line1,
    line2,
  });
  persist();
  renderList();
  setStatus("Saved on this phone.");
  document.querySelector("#list").scrollIntoView({ block: "nearest" });
}

function cellText(text, className) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function lineCell(item, key) {
  const cell = document.createElement("td");
  const input = document.createElement("input");
  input.type = "text";
  input.value = item[key] || "";
  input.maxLength = 200;
  input.autocomplete = "off";
  input.setAttribute("aria-label", key === "line1" ? "Line 1" : "Line 2");
  input.addEventListener("input", () => {
    item[key] = input.value;
    persist();
  });
  cell.append(input);
  return cell;
}

function renderList() {
  listEl.replaceChildren();
  list.forEach((item, index) => {
    const row = document.createElement("tr");
    if (item.name) row.title = item.name;
    row.append(
      lineCell(item, "line1"),
      lineCell(item, "line2"),
      cellText(money(item.regular_price), "num"),
      cellText(money(item.final_price), "num selling"),
      cellText(item.upc_e || "—"),
      cellText(item.sku || "—"),
    );
    const action = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "row-delete";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      list.splice(index, 1);
      persist();
      renderList();
    });
    action.append(remove);
    row.append(action);
    listEl.append(row);
  });
  updateCount();
}

function deleteAll() {
  if (list.length === 0) return;
  const count = list.length;
  const ok = window.confirm(`Delete all ${count} saved tags?`);
  if (!ok) return;
  list = [];
  persist();
  renderList();
  setStatus("Deleted all saved tags.");
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
    scanner = new Html5Qrcode("reader", {
      formatsToSupport: FORMATS,
      verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    });
    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 15,
        qrbox: { width: 280, height: 140 },
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
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
    setStatus("The camera did not start. Type a barcode, an 8-digit number, or a product name.");
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
  const tags = list.map((item) => ({
    line1: item.line1 || "",
    line2: item.line2 || "",
    regularPrice: item.regular_price,
    upc: item.upc_e || "",
  }));
  if (tags.length === 0) {
    setStatus("The list is empty.");
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
matchCard.querySelector("#skip").addEventListener("click", skipMatch);
downloadButton.addEventListener("click", () => {
  void downloadWorkbook();
});
deleteAllButton.addEventListener("click", deleteAll);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) void stopCamera();
});

renderList();
