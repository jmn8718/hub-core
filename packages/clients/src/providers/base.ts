import type { CacheDb, Db } from "@repo/db";
import type { Providers } from "@repo/types";

export class Base {
	protected readonly _cache: CacheDb;

	protected readonly _db: Db;

	constructor(
		protected db: Db,
		protected cache: CacheDb,
	) {
		this._db = db;
		this._cache = cache;
	}

	protected getToken(provider: Providers) {
		return this._db.getProfileToken(provider);
	}

	protected setToken(
		provider: Providers,
		values: {
			accessToken: string;
			refreshToken: string;
			expiresAt: number;
			tokenType: string;
		},
		externalId?: string,
	) {
		this._db.setProfileToken(provider, values, externalId);
	}
}
