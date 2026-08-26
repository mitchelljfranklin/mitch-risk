import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    // Integration suites share one database; running files in parallel let
    // them clobber each other's rows (unique violations on app_settings,
    // flaky API-key requestCount assertions). Files run sequentially;
    // tests within a file were always sequential.
    fileParallelism: false,
  },
});
