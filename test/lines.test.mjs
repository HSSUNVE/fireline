import assert from "node:assert/strict";
import test from "node:test";
import { linesFor } from "../src/lines.mjs";

test("thinkkitchen Scissors fills line 1 and leaves line 2 empty", () => {
  assert.deepEqual(linesFor({ name: "thinkkitchen Scissors" }), {
    line1: "T.K Scissors",
    line2: "",
  });
  assert.deepEqual(linesFor({ name: "thinkitchen Scissors" }), {
    line1: "T.K Scissors",
    line2: "",
  });
});

test("a short thinkkitchen name stays on line 1", () => {
  assert.deepEqual(linesFor({ name: "thinkkitchen Can Opener" }), {
    line1: "T.K Can Opener",
    line2: "",
  });
  assert.deepEqual(linesFor({ name: "thinkkitchen Garlic Press" }), {
    line1: "T.K Garlic Press",
    line2: "",
  });
  assert.deepEqual(
    linesFor({ name: "thinkkitchen Milan Tong", sku: "880369005737", upc_e: "10539800" }),
    { line1: "T.K Milan Tong", line2: "" },
  );
});

test("a long thinkkitchen name wraps at a word that fits the narrow tag", () => {
  assert.deepEqual(linesFor({ name: "thinkitchen Amara Can Opener" }), {
    line1: "T.K Amara Can",
    line2: "Opener",
  });
  assert.deepEqual(linesFor({ name: "thinkkitchen Linea Garlic Press" }), {
    line1: "T.K Linea Garlic",
    line2: "Press",
  });
  assert.deepEqual(linesFor({ name: "thinkitchen Pro-Fit Blender with 2 Bottles" }), {
    line1: "T.K Pro-Fit Blender",
    line2: "with 2 Bottles",
  });
});

test("dinnerware, the candle, and Culin Air stay on their exact lines", () => {
  assert.deepEqual(linesFor({ name: "SHANTI- 12PC- DINNERWARE" }), {
    line1: "SHANTI",
    line2: "12 pc dinner ware",
  });
  assert.deepEqual(linesFor({ name: "GREEN SYLVA- 12PC- DINNERWARE" }), {
    line1: "GREEN SYLVA",
    line2: "12 pc dinner ware",
  });
  assert.deepEqual(linesFor({ name: "SCENTED CANDLE BLACK VASE H23CM" }), {
    line1: "SCENTED CANDLE",
    line2: "BLACK VASE H23CM",
  });
  const culin = {
    line1: "Culin Air",
    line2: "Digital Air Fryer 3.8 L, 1350 W",
  };
  assert.deepEqual(
    linesFor({
      name: "Stokes 3.8L Digital Air Fryer, 1350W",
      sku: "880369834412",
      url_key: "culin-air-3-8litre-digital-air-fryer-black-1350w-880369834412",
    }),
    culin,
  );
  assert.deepEqual(linesFor({ name: "Friteuse à air numérique Stokes 3.8L, 1350W", sku: "880369834412" }), culin);
});

test("other English names are wrapped and never left blank", () => {
  assert.deepEqual(linesFor({ name: "PRIMO-GLASS CONTAINER 1040ML,WITH LID", sku: "880369832074" }), {
    line1: "PRIMO-GLASS",
    line2: "CONTAINER 1040ML,WITH LID",
  });
  assert.deepEqual(linesFor({ name: "Glass Bowl 12oz" }), {
    line1: "Glass Bowl 12oz",
    line2: "",
  });
  assert.deepEqual(linesFor({ name: "Stokes Something Else" }), {
    line1: "Stokes Something",
    line2: "Else",
  });
  assert.deepEqual(linesFor({ name: "NATURELLA. 12PC. DINNERWARE. BEIGE" }), {
    line1: "NATURELLA. 12PC.",
    line2: "DINNERWARE. BEIGE",
  });
  for (const name of ["PRIMO-GLASS CONTAINER 1040ML,WITH LID", "LED Glass Mushroom", "T.K Avocado Tool"]) {
    assert.ok(linesFor({ name }).line1, name);
  }
});

test("a French title is translated to English before the split", () => {
  assert.deepEqual(linesFor({ name: "BOUGIE PARFUM" }), {
    line1: "scented candle",
    line2: "",
  });
  assert.deepEqual(linesFor({ name: "VASE NOIR" }), {
    line1: "black vase",
    line2: "",
  });
  assert.deepEqual(linesFor({ name: "Ouvre-boîte thinkitchen Amara" }), {
    line1: "T.K Amara Can",
    line2: "Opener",
  });
  assert.deepEqual(linesFor({ name: "Savon à mains parfumé au fruit du dragon, 500 ml" }), {
    line1: "hand soap scented",
    line2: "with dragon fruit, 500 ml",
  });
  assert.notEqual(linesFor({ name: "BOUGIE PARFUM" }).line1, "");
});
