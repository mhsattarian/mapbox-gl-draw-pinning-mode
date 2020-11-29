import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import html from "@rollup/plugin-html";
import serve from "rollup-plugin-serve";

import { readFileSync } from "fs";

export default {
  input: "src/index.js",
  output: {
    file: "dist/mapbox-gl-draw-pinning-mode.js",
    format: "umd",
    name: "mapboxGlDrawPinningMode",
    globals: {
      "@mapbox/mapbox-gl-draw/src/modes/simple_select":
        "MapboxDraw.modes.simple_select",
    },
  },
  external: ["@mapbox/mapbox-gl-draw/src/modes/simple_select"],
  plugins: [
    nodeResolve(),
    commonjs(),
    html({
      template: ({ attributes, bundle, files, publicPath, title }) => {
        const fileName = files.js[0].fileName;

        const template = readFileSync("docs/index.html", "utf-8");
        return template.replace(
          "https://unpkg.com/mapbox-gl-draw-pinning-mode",
          `${publicPath}${fileName}`
        );
      },
    }),
    serve({
      contentBase: "dist",
      port: 8080,
      open: true,
    }),
  ],
};
