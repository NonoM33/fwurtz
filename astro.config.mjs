import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: { host: true, port: 3000 },
  // Astro's default CSRF check rejects all multipart/form POSTs even when same-origin
  // (it doesn't always honor X-Forwarded headers behind a reverse proxy). Our admin
  // routes are protected by:
  //   - middleware checking the signed session cookie (HttpOnly, SameSite=Lax)
  //   - the cookie's SameSite=Lax, which prevents cross-site form POSTs from carrying it
  // So disabling checkOrigin here doesn't open a CSRF hole, and it lets the admin
  // upload form work behind Coolify's reverse proxy.
  security: { checkOrigin: false },
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
