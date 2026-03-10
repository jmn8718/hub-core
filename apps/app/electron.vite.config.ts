import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const readVersion = (packageJsonPath: string) => {
	try {
		const content = readFileSync(packageJsonPath, "utf-8");
		const parsed = JSON.parse(content) as { version?: string };
		return parsed.version || "unknown";
	} catch {
		return "unknown";
	}
};

const resolveCommit = (repoRoot: string) => {
	try {
		return execSync("git rev-parse --short HEAD", { cwd: repoRoot })
			.toString()
			.trim();
	} catch {
		return "unknown";
	}
};

const appRoot = process.cwd();
const repoRoot = resolve(appRoot, "../..");
const buildInfoDefines = {
	"import.meta.env.VITE_HUB_APP_VERSION": JSON.stringify(
		readVersion(resolve(appRoot, "package.json")),
	),
	"import.meta.env.VITE_HUB_CLIENT_VERSION": JSON.stringify(
		readVersion(resolve(repoRoot, "packages/app/package.json")),
	),
	"import.meta.env.VITE_HUB_COMMIT": JSON.stringify(resolveCommit(repoRoot)),
};

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()],
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
	},
	renderer: {
		define: buildInfoDefines,
		resolve: {
			alias: {
				"@renderer": resolve("src/renderer/src"),
			},
		},
		plugins: [react()],
	},
});
