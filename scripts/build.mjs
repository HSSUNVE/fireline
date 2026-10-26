import { copyFile, mkdir } from "node:fs/promises";
import * as esbuild from "esbuild";

await mkdir("public", { recursive: true });
await esbuild.build({
  entryPoints: ["src/client.mjs"],
  bundle: true,
  outfile: "public/app.js",
  format: "iife",
  target: ["safari16"],
  legalComments: "none",
});
await copyFile("template/petites-affiches.xlsx", "public/petites-affiches.xlsx");
