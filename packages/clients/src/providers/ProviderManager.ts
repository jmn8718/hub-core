import type { CacheDb, Db } from "@repo/db";
import { type Credentials, Providers } from "@repo/types";
import pMap from "p-map";
import pQueue from "p-queue";
import type { Client } from "./Client.js";
import { CorosClient } from "./coros.js";
import { GarminClient } from "./garmin.js";

const initializeProviderClient = (provider: Providers, cache: CacheDb) => {
	if (provider === Providers.COROS) {
		return new CorosClient(cache);
	}
	if (provider === Providers.GARMIN) {
		return new GarminClient(cache);
	}
	throw new Error("Invalid client");
};

export class ProviderManager {
	private _queue = new pQueue({ concurrency: 1 });
	private _db: Db;
	// @ts-expect-error no need to initialize with undefined
	private _clients: Record<Providers, Client | undefined> = {};

	private _cache: CacheDb;

	constructor(db: Db, cache: CacheDb) {
		this._db = db;
		this._cache = cache;
	}

	private _getProvider(provider: Providers) {
		if (!this._clients[provider])
			throw new Error(`${provider} not initialized`);
		return this._clients[provider];
	}

	public initializeClient(provider: Providers) {
		if (this._clients[provider]) return;
		this._clients[provider] = initializeProviderClient(provider, this._cache);
	}

	public connect(provider: Providers, credentials: Credentials) {
		const client = this._getProvider(provider);
		return client.connect(credentials);
	}

	public syncGears(provider: Providers) {
		const client = this._getProvider(provider);
		return client.syncGears().then((gears) => {
			if (gears.length === 0) return [];
			return pMap(gears, (gearPayload) => this._db.insertGear(gearPayload), {
				concurrency: 1,
			});
		});
	}

	public sync(provider: Providers, force = false) {
		const client = this._getProvider(provider);
		return (
			force
				? client.sync({})
				: this._db
						.getLastProviderActivity(provider)
						.then((lastDbProviderActivity) =>
							client.sync({
								id: lastDbProviderActivity?.id,
								lastTimestamp: lastDbProviderActivity?.timestamp,
							}),
						)
		).then((activities) => {
			if (activities.length === 0) return [];
			return pMap(activities, (activityPayload) =>
				this._queue
					.add(() => this._db.insertActivity(activityPayload))
					.catch((err) => {
						console.warn(
							`error on ${activityPayload.activity.providerActivity?.id}`,
						);
						console.error(err);
					}),
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

	public linkGear({
		gearId,
		activityId,
	}: {
		gearId: string;
		activityId: string;
	}) {
		// first link on our local db
		return (
			this._db
				.linkActivityGear(activityId, gearId)
				// fetch providers data
				.then(() => this._db.getGearConnections(gearId))
				// link on provider
				.then((connections) => {
					return pMap(
						connections,
						async ({ provider, providerId }) => {
							if (!provider || !this._clients[provider as Providers]) return;
							// biome-ignore lint/style/noNonNullAssertion: <explanation>
							const client = this._clients[provider as Providers]!;
							const activityProvider = await this._db.getActivityProvider(
								activityId,
								provider as Providers,
							);
							// we can have only 1 activity on each provider
							if (activityProvider[0]?.activityId) {
								await client.linkActivityGear(
									activityProvider[0].activityId,
									// biome-ignore lint/style/noNonNullAssertion: <explanation>
									providerId!,
								);
							}
						},
						{
							concurrency: 1,
							stopOnError: false,
						},
					);
				})
		);
	}

	public unlinkGear({
		gearId,
		activityId,
	}: {
		gearId: string;
		activityId: string;
	}) {
		// first unlink on our local db
		return (
			this._db
				.unlinkActivityGear(activityId, gearId)
				// fetch providers data
				.then(() => this._db.getGearConnections(gearId))
				// unlink on provider
				.then((connections) => {
					return pMap(
						connections,
						async ({ provider, providerId }) => {
							if (!provider || !this._clients[provider as Providers]) return;
							// biome-ignore lint/style/noNonNullAssertion: <explanation>
							const client = this._clients[provider as Providers]!;
							const activityProvider = await this._db.getActivityProvider(
								activityId,
								provider as Providers,
							);
							// we can have only 1 activity on each provider
							if (activityProvider[0]?.activityId) {
								await client.unlinkActivityGear(
									activityProvider[0].activityId,
									// biome-ignore lint/style/noNonNullAssertion: <explanation>
									providerId!,
								);
							}
						},
						{
							concurrency: 1,
							stopOnError: false,
						},
					);
				})
		);
	}

	public uploadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		target: Providers;
		downloadPath: string;
	}) {
		const sourceClient = this._getProvider(params.provider);
		const filePath = sourceClient.generateActivityFilePath(
			params.downloadPath,
			params.providerActivityId,
		);
		const targetClient = this._getProvider(params.target);
		return targetClient
			.uploadActivity(filePath)
			.then((activityId) => targetClient.syncActivity(activityId));
	}

	public downloadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		downloadPath: string;
	}) {
		const client = this._getProvider(params.provider);
		// download activity
		return client.downloadActivity(
			params.providerActivityId,
			params.downloadPath,
		);
	}

	public exportActivityManual(params: {
		target: Providers;
		activityId: string;
	}) {
		const client = this._getProvider(params.target);
		return this._db
			.getActivity(params.activityId)
			.then((activity) => {
				if (!activity) throw new Error("Missing activity");
				if (
					activity.connections.find(
						({ provider }) => provider === params.target,
					)
				)
					throw new Error("Activity already connected to provider");

				return client.createManualActivity(activity);
			})
			.then((newActivityId) => client.syncActivity(newActivityId));
	}

	public gearStatusUpdate(params: {
		provider: Providers;
		providerUuid: string;
		status: "active" | "retired";
		dateEnd?: Date;
	}) {
		const client = this._getProvider(params.provider);
		return client.gearStatusUpdate(params);
	}
}
