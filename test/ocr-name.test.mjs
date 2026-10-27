import assert from "node:assert/strict";
import test from "node:test";
import { nameFromOcrLines } from "../src/ocr-name.mjs";

test("a printed tag name drops the store, the price, and the tag number", () => {
  assert.equal(
    nameFromOcrLines([
      "STOKES",
      "thinkkitchen Milan Tong",
      "$12.99",
      "10539800",
    ]),
    "thinkkitchen Milan Tong",
  );
});

test("two name lines stay in reading order", () => {
  assert.equal(
    nameFromOcrLines(["thinkkitchen", "Seafood Scissors", "Reg 9.99"]),
    "thinkkitchen Seafood Scissors",
  );
});

test("a tag with no words does not become a search", () => {
  assert.equal(nameFromOcrLines(["12.99", "10539800", ""]), "");
});

test("a product line that contains a count stays in the search", () => {
  assert.equal(
    nameFromOcrLines(["12 pc dinner ware", "Regular price $24.99"]),
    "12 pc dinner ware",
  );
});
