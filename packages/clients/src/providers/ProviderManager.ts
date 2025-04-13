import type { Db } from "@repo/db";
import { type Credentials, Providers } from "@repo/types";
import pMap from "p-map";
import type { Client } from "./Client.js";
import { CorosClient } from "./coros.js";
import { GarminClient } from "./garmin.js";

const initializeProviderClient = (provider: Providers) => {
	if (provider === Providers.COROS) {
		return new CorosClient();
	}
	if (provider === Providers.GARMIN) {
		return new GarminClient();
	}
	throw new Error("Invalid client");
};

export class ProviderManager {
	private _db: Db;
	// @ts-expect-error no need to initialize with undefined
	private _clients: Record<Providers, Client | undefined> = {};

	constructor(db: Db) {
		this._db = db;
	}

	private _getProvider(provider: Providers) {
		if (!this._clients[provider])
			throw new Error(`${provider} not initialized`);
		return this._clients[provider];
	}

	public initializeClient(provider: Providers) {
		if (this._clients[provider]) return;
		this._clients[provider] = initializeProviderClient(provider);
	}

	public connect(provider: Providers, credentials: Credentials) {
		const client = this._getProvider(provider);
		return client.connect(credentials);
	}

	public syncGear(provider: Providers) {
		const client = this._getProvider(provider);
		return client.syncGears().then((gears) => {
			if (gears.length === 0) return [];
			return pMap(gears, (gearPayload) => this._db.insertGear(gearPayload), {
				concurrency: 1,
			});
		});
	}

	public sync(provider: Providers) {
		const client = this._getProvider(provider);
		return this._db
			.getLastProviderActivity(provider)
			.then((lastDbProviderActivity) =>
				client.sync({
					id: lastDbProviderActivity?.id,
					lastTimestamp: lastDbProviderActivity?.timestamp,
				}),
			)
			.then((activities) => {
				if (activities.length === 0) return [];
				return pMap(
					activities,
					(activityPayload) => this._db.insertActivity(activityPayload),
					{
						concurrency: 1,
					},
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
