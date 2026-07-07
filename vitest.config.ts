import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Only unit-test pure logic under src/lib/reports; no DOM / DB needed.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
