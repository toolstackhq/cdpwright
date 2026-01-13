import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "assert/expect": "src/assert/expect.ts"
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true
  }
]);
