import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: appRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });

    child.on("error", reject);
  });
}

if (process.env.VERCEL === "1") {
  console.log("Skipping Electron postinstall on Vercel.");
  process.exit(0);
}

await run("node", ["./scripts/cleanupBrokenWorkspaceLinks.mjs"]);
await run("electron-builder", ["install-app-deps"]);
