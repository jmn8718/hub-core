import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/migrations.ts"],
	format: ["esm"],
	dts: true,
	minify: false,
	outDir: "dist/",
	clean: true,
	sourcemap: false,
	bundle: true,
	splitting: false,
	outExtension(ctx) {
		return {
			dts: ".d.ts",
			js: ctx.format === "cjs" ? ".cjs" : ".js",
		};
	},
	treeshake: false,
	target: "es2022",
	platform: "node",
	tsconfig: "./tsconfig.json",
	cjsInterop: true,
	keepNames: true,
	skipNodeModulesBundle: false,
	onSuccess: "node scripts/copy-dir.js",
});
