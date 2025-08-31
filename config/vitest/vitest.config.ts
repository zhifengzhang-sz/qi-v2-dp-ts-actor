import { resolve } from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const rootDir = resolve(__dirname, "../..");

export default defineConfig(() => {
  return {
    plugins: [tsconfigPaths()],
    resolve: {
      alias: {
        "@qi/base": resolve(rootDir, "../qi-v2-qicore/typescript/lib/base"),
      },
    },
    test: {
      environment: "node",
      globals: true,
      include: [
        resolve(rootDir, "lib/tests/**/*.test.ts"),
        resolve(rootDir, "app/tests/**/*.test.ts"),
        resolve(rootDir, "tests/**/*.test.ts"),
      ],
      exclude: [resolve(rootDir, "node_modules/**"), resolve(rootDir, "dist/**")],
      isolate: true,
      pool: "forks",
      env: process.env,
    },
  };
});
