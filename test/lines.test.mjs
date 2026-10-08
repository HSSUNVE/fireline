import assert from "node:assert/strict";
import test from "node:test";
import { linesFor } from "../src/lines.mjs";

test("thinkkitchen and thinkitchen put the model word on line 1", () => {
  assert.deepEqual(
    linesFor({ name: "thinkkitchen Milan Tong", sku: "880369005737", upc_e: "10539800" }),
    { line1: "T.K Milan", line2: "Tong" },
  );
  assert.deepEqual(linesFor({ name: "thinkitchen Amara Can Opener" }), {
    line1: "T.K Amara",
    line2: "Can Opener",
  });
  assert.deepEqual(linesFor({ name: "thinkkitchen Linea Garlic Press" }), {
    line1: "T.K Linea",
    line2: "Garlic Press",
  });
  assert.deepEqual(linesFor({ name: "thinkitchen Casa Spice Rack, Unfilled" }), {
    line1: "T.K Casa",
    line2: "Spice Rack, Unfilled",
  });
  assert.deepEqual(linesFor({ name: "thinkitchen Pro-Fit Blender with 2 Bottles" }), {
    line1: "T.K Pro-Fit",
    line2: "Blender with 2 Bottles",
  });
  assert.deepEqual(linesFor({ name: "thinkkitchen Big Spoon" }), {
    line1: "T.K Big",
    line2: "Spoon",
  });
});

test("a thinkkitchen title with no model word stays blank", () => {
  for (const name of [
    "thinkkitchen Scissors",
    "thinkkitchen T.K Torch",
    "T.K Avocado Tool",
    "Stokes T.K Linea Pizza Cutter",
    "Ouvre-boîte thinkitchen Amara",
  ]) {
    assert.deepEqual(linesFor({ name }), { line1: "", line2: "" }, name);
  }
});

test("dinnerware uses the pattern name and the English piece line", () => {
  assert.deepEqual(linesFor({ name: "SHANTI- 12PC- DINNERWARE" }), {
    line1: "SHANTI",
    line2: "12 pc dinner ware",
  });
  assert.deepEqual(linesFor({ name: "GREEN SYLVA- 12PC- DINNERWARE" }), {
    line1: "GREEN SYLVA",
    line2: "12 pc dinner ware",
  });
  assert.deepEqual(linesFor({ name: "NATURELLA. 12PC. DINNERWARE. BEIGE" }), {
    line1: "",
    line2: "",
  });
  assert.deepEqual(linesFor({ name: "PORTO REACTIVE BROWN 12PC DINNERWARE" }), {
    line1: "",
    line2: "",
  });
});

test("the candle and the Culin Air fryer use the written two lines", () => {
  assert.deepEqual(linesFor({ name: "SCENTED CANDLE BLACK VASE H23CM" }), {
    line1: "SCENTED CANDLE",
    line2: "BLACK VASE H23CM",
  });
  assert.deepEqual(linesFor({ name: "BOUGIE PARFUM" }), { line1: "", line2: "" });
  assert.deepEqual(linesFor({ name: "VASE NOIR" }), { line1: "", line2: "" });
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
  assert.deepEqual(linesFor({ name: "Stokes 3.8L Digital Air Fryer, 1350W" }), culin);
  assert.deepEqual(
    linesFor({ name: "Stokes 3.8L Digital Air Fryer, 1350W", sku: "880369834412" }),
    culin,
  );
  assert.deepEqual(linesFor({ name: "Stokes Something Else" }), { line1: "", line2: "" });
});
