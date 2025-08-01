import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@qi/core/base": resolve(rootDir, "lib/src/qicore/base"),
      "@qi/mcp": resolve(rootDir, "lib/src/qimcp/client"),
      "@qi/dp/dsl": resolve(rootDir, "lib/src/dsl/index.ts"),
      "@qi/dp/actors": resolve(rootDir, "lib/src/actors"),
      "@qi/dp/actors/abstract": resolve(rootDir, "lib/src/actors/abstract"),
      "@qi/dp/actors/sources": resolve(rootDir, "lib/src/actors/sources"),
      "@qi/dp/actors/targets": resolve(rootDir, "lib/src/actors/targets"),
      "@qi/dp/base": resolve(rootDir, "lib/src/base"),
      "@qi/dp/generators": resolve(rootDir, "lib/src/generators"),
    },
  },
  test: {
    name: "system",
    environment: "node",
    globals: true,
    include: [resolve(rootDir, "lib/tests/system/**/*.test.ts")],
    exclude: [resolve(rootDir, "node_modules/**"), resolve(rootDir, "dist/**")],
    isolate: true,
    pool: "forks",
    testTimeout: 60000, // Very long timeout for end-to-end tests
    hookTimeout: 15000,
    teardownTimeout: 15000,
    reporters: ["verbose", "json"],
    outputFile: {
      json: resolve(rootDir, "test-results/system-results.json"),
    },
    // Allow retries for flaky end-to-end tests
    retry: 2,
  },
});
