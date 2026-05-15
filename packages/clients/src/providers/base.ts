import type { CacheDb, Db } from "@repo/db";
import type { Providers } from "@repo/types";

export class Base {
	protected readonly _cache: CacheDb;

	protected readonly _db: Db;

	protected _externalId?: string;

	constructor(
		protected db: Db,
		protected cache: CacheDb,
	) {
		this._db = db;
		this._cache = cache;
	}

	protected getTokenFromDb(provider: Providers, externalId?: string) {
		return this._db.getProfileToken(provider, externalId);
	}

	protected setTokenOnDb(
		provider: Providers,
		values: {
			accessToken: string;
			refreshToken: string;
			expiresAt: number;
			tokenType: string;
		},
		externalId?: string,
	) {
		return this._db.setProfileToken(provider, values, externalId);
	}
}
