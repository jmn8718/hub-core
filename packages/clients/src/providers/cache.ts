const isNodeEnvironment =
	typeof process !== "undefined" && !!process.versions?.node;

let existsSync: typeof import("node:fs")["existsSync"] = () => false;
let mkdirSync: typeof import("node:fs")["mkdirSync"] = () => undefined;
let readFileSync: typeof import("node:fs")["readFileSync"] = () => {
	throw new Error("readFileSync not available in browser environment");
};
let writeFileSync: typeof import("node:fs")["writeFileSync"] = () => undefined;
let dirname: typeof import("node:path")["dirname"] = () => "";
let join: typeof import("node:path")["join"] = (...parts: string[]) =>
	parts.filter(Boolean).join("/");
let fileURLToPath: typeof import("node:url")["fileURLToPath"] = () => "";

if (isNodeEnvironment) {
	const fs = await import("node:fs");
	const path = await import("node:path");
	const url = await import("node:url");
	existsSync = fs.existsSync;
	mkdirSync = fs.mkdirSync;
	readFileSync = fs.readFileSync;
	writeFileSync = fs.writeFileSync;
	dirname = path.dirname;
	join = path.join;
	fileURLToPath = url.fileURLToPath;
}

const __filename = isNodeEnvironment ? fileURLToPath(import.meta.url) : "";

export class Cache {
	private _dirname = "";
	private _useMemory = true;
	private _cache: Record<string, string> = {};

	constructor(targetDirname?: string) {
		if (targetDirname && isNodeEnvironment) {
			try {
				this._dirname = join(
					targetDirname || dirname(__filename),
					"cache_data",
				);
				if (!existsSync(this._dirname)) {
					mkdirSync(this._dirname);
				}
				this._useMemory = false;
			} catch (err) {
				console.error(err);
			}
		}
		console.debug(
			`CACHE: ${this._dirname && !this._useMemory ? this._dirname : "memory"}`,
		);
	}
	_filepath(id: string) {
		return join(this._dirname, `${id}.json`);
	}

	get<T>(id: string) {
		let content: string | undefined;
		if (this._useMemory) {
			content = this._cache[id];
		} else {
			const filePath = this._filepath(id);
			if (existsSync(filePath)) {
				content = readFileSync(filePath, {
					encoding: "utf8",
				}).toString();
			}
		}
		return content ? (JSON.parse(content) as T) : undefined;
	}

	set(id: string, content: unknown) {
		if (this._useMemory) {
			this._cache[id] = JSON.stringify(content);
		} else {
			writeFileSync(this._filepath(id), JSON.stringify(content, null, 2), {
				encoding: "utf8",
			});
		}
	}
}
