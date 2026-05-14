import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env["PORT"] ?? 4321);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  ...(process.env["CI"] ? { workers: 1 } : {}),
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `bun run preview -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
