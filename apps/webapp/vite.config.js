import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from '@vitejs/plugin-react';
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const readVersion = (packageJsonPath) => {
  try {
    const content = readFileSync(packageJsonPath, "utf-8");
    const parsed = JSON.parse(content);
    return parsed.version || "unknown";
  } catch {
    return "unknown";
  }
};

const resolveCommit = (repoRoot) => {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: repoRoot }).toString().trim();
  } catch {
    return "unknown";
  }
};

const appRoot = process.cwd();
const repoRoot = resolve(appRoot, "../..");

export default defineConfig({
  define: {
    "import.meta.env.VITE_HUB_APP_VERSION": JSON.stringify(readVersion(resolve(appRoot, "package.json"))),
    "import.meta.env.VITE_HUB_CLIENT_VERSION": JSON.stringify(readVersion(resolve(repoRoot, "packages/app/package.json"))),
    "import.meta.env.VITE_HUB_COMMIT": JSON.stringify(resolveCommit(repoRoot)),
  },
  plugins: [react(), tsconfigPaths()],
});
