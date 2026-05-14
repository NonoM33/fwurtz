import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: { host: true, port: 3000 },
  vite: {
    resolve: {
      alias: {
        "~": new URL("./src", import.meta.url).pathname,
        "@features": new URL("./src/features", import.meta.url).pathname,
        "@shared": new URL("./src/shared", import.meta.url).pathname,
        "@components": new URL("./src/components", import.meta.url).pathname,
      },
    },
  },
});
