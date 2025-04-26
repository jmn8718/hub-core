import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

export class Cache {
	private _dirname = "";
	private _useMemory = true;
	private _cache: Record<string, string> = {};

	constructor(targetDirname?: string) {
		if (targetDirname) {
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
