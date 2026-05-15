import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/features/concierge/domain/**/*.ts",
        "src/features/concierge/application/**/*.ts",
        "src/features/concierge/infra/**/*.ts",
        "src/features/admin-auth/infra/**/*.ts",
        "src/features/media/infra/**/*.ts",
        "src/features/role/**/*.ts",
        "src/features/testimonials/infra/**/*.ts",
        "src/shared/db/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/**/*.d.ts",
        "src/**/types.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
      "@features": new URL("./src/features", import.meta.url).pathname,
      "@shared": new URL("./src/shared", import.meta.url).pathname,
      "@components": new URL("./src/components", import.meta.url).pathname,
    },
  },
});
