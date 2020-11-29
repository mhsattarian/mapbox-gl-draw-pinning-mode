import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import del from "rollup-plugin-delete";

export default {
  input: "src/index.js",
  output: {
    file: "./dist/mapbox-gl-draw-pinning-mode.js",
    format: "umd",
    name: "mapboxGlDrawPinningMode",
    globals: {
      "@mapbox/mapbox-gl-draw/src/modes/simple_select":
        "MapboxDraw.modes.simple_select",
    },
  },
  external: ["@mapbox/mapbox-gl-draw/src/modes/simple_select"],
  plugins: [del({ targets: "dist/*" }), nodeResolve(), commonjs(), terser()],
};
