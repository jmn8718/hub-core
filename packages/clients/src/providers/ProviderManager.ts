import type { Db } from "@repo/db";
import type { Credentials, Providers } from "@repo/types";
import pMap from "p-map";
import type { Client } from "./Client.js";

export class ProviderManager {
	private _db: Db;
	// @ts-expect-error no need to initialize with undefined
	private _clients: Record<Providers, Client | undefined> = {};

	constructor(db: Db) {
		this._db = db;
	}

	public addClient(provider: Providers, client: Client) {
		this._clients[provider] = client;
	}

	private _getProvider(provider: Providers) {
		if (!this._clients[provider])
			throw new Error(`${provider} not initialized`);
		return this._clients[provider];
	}

	public connect(provider: Providers, credentials: Credentials) {
		const client = this._getProvider(provider);
		return client.connect(credentials);
	}

	public sync(provider: Providers) {
		const client = this._getProvider(provider);
		return this._db
			.getLastProviderActivity(provider)
			.then((lastDbProviderActivity) =>
				client.sync(lastDbProviderActivity?.timestamp),
			)
			.then((activities) => {
				if (activities.length === 0) return;
				return pMap(activities, (activityPayload) =>
					this._db.insertActivity(activityPayload),
				);
			});
	}

	public syncActivity(provider: Providers, activityId: string) {
		const client = this._getProvider(provider);
		return client.syncActivity(activityId).then((activityPayload) => {
			if (!activityPayload) return;
			return this._db.insertActivity(activityPayload);
		});
	}
}
