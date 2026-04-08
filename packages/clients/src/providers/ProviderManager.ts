import type { CacheDb, Db, IInsertActivityPayload } from "@repo/db";
import {
	type ActivityRegenerationSummary,
	ActivityType,
	type ConnectCredentials,
	type IDbGearWithDistance,
	Providers,
	type StravaClientOptions,
} from "@repo/types";
import pMap from "p-map";
import pQueue from "p-queue";
import type { Client } from "./Client.js";
import { CorosClient } from "./coros.js";
import { GarminClient } from "./garmin.js";
import { StravaClient } from "./strava.js";

type ProviderOptions =
	| {
			provider: Providers.COROS | Providers.GARMIN;
	  }
	| {
			provider: Providers.STRAVA;
			options: StravaClientOptions;
	  };

type ProviderGearCreator = {
	createGear?: (gear: IDbGearWithDistance) => Promise<string>;
};

function initializeProviderClient(
	db: Db,
	cache: CacheDb,
	providerOptions: ProviderOptions,
): Client {
	if (providerOptions.provider === Providers.COROS) {
		return new CorosClient(db, cache);
	}
	if (providerOptions.provider === Providers.GARMIN) {
		return new GarminClient(db, cache);
	}
	if (providerOptions.provider === Providers.STRAVA) {
		if (!providerOptions.options) {
			throw new Error("Strava client requires configuration options");
		}
		return new StravaClient(db, cache, providerOptions.options);
	}
	throw new Error(`Unsupported provider: ${providerOptions.provider}`);
}

export class ProviderManager {
	private _queue = new pQueue({ concurrency: 1 });
	private _db: Db;
	private _cache: CacheDb;

	private _clients: Record<Providers, Client | undefined> = {
		[Providers.COROS]: undefined,
		[Providers.GARMIN]: undefined,
		[Providers.STRAVA]: undefined,
	};

	constructor(db: Db, cache: CacheDb) {
		this._db = db;
		this._cache = cache;
	}

	public setDb(db: Db) {
		this._db = db;
	}

	public setCache(cache: CacheDb) {
		this._cache = cache;
	}

	private _getProvider(provider: Providers) {
		if (!this._clients[provider])
			throw new Error(`${provider} not initialized`);
		return this._clients[provider];
	}

	public initializeClient(options: ProviderOptions) {
		this._clients[options.provider] = initializeProviderClient(
			this._db,
			this._cache,
			options,
		);
	}

	public connect(provider: Providers, credentials: ConnectCredentials) {
		console.log(`Connecting to provider ${provider}`);
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

	public async createGearOnProvider({
		provider,
		gearId,
	}: {
		provider: Providers;
		gearId: string;
	}) {
		const client = this._getProvider(provider) as Client & ProviderGearCreator;
		if (!client.createGear) {
			throw new Error(`${provider} does not support gear creation`);
		}
		const gear = await this._db.getGear(gearId);
		if (!gear) {
			throw new Error("Missing gear");
		}
		if (
			gear.providerConnections?.some(
				(connection) => connection.provider === provider,
			)
		) {
			throw new Error("Gear already connected to provider");
		}
		const providerGearId = await client.createGear(gear);
		await this.syncGears(provider);
		return providerGearId;
	}

	private insertInDatabase(payload: IInsertActivityPayload) {
		return this._queue
			.add(() => this._db.insertActivity(payload))
			.catch((err) => {
				console.error(err);
				console.debug(payload);
				console.error(err);
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
		).then((activities) =>
			pMap(activities, this.insertInDatabase.bind(this), { concurrency: 1 }),
		);
	}

	public syncActivity(provider: Providers, activityId: string) {
		const client = this._getProvider(provider);
		return client
			.syncActivity(activityId)
			.then(this.insertInDatabase.bind(this));
	}

	public async persistActivityCache(params: {
		provider: Providers;
		providerActivityId: string;
	}) {
		const client = this._getProvider(params.provider);
		const details = await client.getActivity(params.providerActivityId, {
			force: true,
		});
		await this._cache.set(
			params.provider,
			"activity",
			params.providerActivityId,
			details,
		);
		return details;
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
			.then((activityId) => this.syncActivity(params.target, activityId));
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
			.then((newActivityId) => this.syncActivity(params.target, newActivityId));
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

	public async updateActivityNotes(params: {
		activityId: string;
		notes?: string | null;
	}) {
		const activity = await this._db.getActivity(params.activityId);
		if (!activity?.connections?.length) return;
		await pMap(
			activity.connections,
			async ({ provider, id }) => {
				if (!provider || !this._clients[provider]) return;
				const client = this._clients[provider];
				if (!client) return;
				try {
					await client.updateActivityNotes(id, params.notes ?? undefined);
				} catch (error) {
					console.error(error);
				}
			},
			{
				concurrency: 1,
				stopOnError: false,
			},
		);
	}

	public async updateActivityName(params: {
		activityId: string;
		name?: string | null;
	}) {
		const activity = await this._db.getActivity(params.activityId);
		if (!activity?.connections?.length) return;
		await pMap(
			activity.connections,
			async ({ provider, id }) => {
				if (!provider || !this._clients[provider]) return;
				const client = this._clients[provider];
				if (!client) return;
				try {
					await client.updateActivityName(id, params.name ?? undefined);
				} catch (error) {
					console.error(error);
				}
			},
			{
				concurrency: 1,
				stopOnError: false,
			},
		);
	}

	private _selectMetadataSourceConnection(
		activity: Awaited<ReturnType<Db["getActivity"]>>,
	) {
		if (!activity) return;
		const originalConnection = activity.connections.find(
			(connection) =>
				Boolean(connection.original) &&
				Boolean(connection.provider) &&
				Boolean(connection.id),
		);
		return (
			originalConnection ||
			activity.connections.find(
				(connection) =>
					connection.provider === Providers.STRAVA && Boolean(connection.id),
			)
		);
	}

	public async regenerateActivityMetadata(activityId: string): Promise<void> {
		const activity = await this._db.getActivity(activityId);
		if (!activity) {
			throw new Error("Missing activity");
		}
		if (
			activity.type !== ActivityType.RUN &&
			activity.type !== ActivityType.BIKE
		) {
			throw new Error(
				"Metadata regeneration is only supported for run and bike activities",
			);
		}

		const selectedConnection = this._selectMetadataSourceConnection(activity);
		if (!selectedConnection?.provider || !selectedConnection.id) {
			throw new Error("No eligible provider connection found");
		}

		const client = this._clients[selectedConnection.provider];
		if (!client) {
			throw new Error(`${selectedConnection.provider} not initialized`);
		}

		const payload = await client.syncActivity(selectedConnection.id);
		const metadata = payload.activity.data.metadata;
		if (!metadata || Object.keys(metadata).length === 0) {
			throw new Error("No metadata available from provider activity");
		}

		const nextTimestamp = payload.activity.data.timestamp;
		if (!nextTimestamp || Number.isNaN(nextTimestamp)) {
			throw new Error("No valid timestamp available from provider activity");
		}

		await this._db.editActivity(activityId, {
			metadata,
			timestamp: nextTimestamp,
		});
	}

	public async regenerateActivitiesData(): Promise<ActivityRegenerationSummary> {
		const summary: ActivityRegenerationSummary = {
			total: 0,
			eligible: 0,
			regenerated: 0,
			skipped: 0,
			failed: 0,
			failures: [],
		};

		let cursor: string | undefined;

		do {
			const batch = await this._db.getActivities({
				limit: 100,
				cursor,
			});

			for (const activity of batch.data) {
				summary.total += 1;
				if (
					activity.type !== ActivityType.RUN &&
					activity.type !== ActivityType.BIKE
				) {
					summary.skipped += 1;
					continue;
				}
				const selectedConnection =
					this._selectMetadataSourceConnection(activity);

				if (!selectedConnection?.provider || !selectedConnection.id) {
					summary.skipped += 1;
					continue;
				}

				summary.eligible += 1;

				if (!this._clients[selectedConnection.provider]) {
					summary.failed += 1;
					summary.failures.push({
						activityId: activity.id,
						provider: selectedConnection.provider,
						providerActivityId: selectedConnection.id,
						error: `${selectedConnection.provider} not initialized`,
					});
					continue;
				}

				try {
					const client = this._getProvider(selectedConnection.provider);
					const payload = await client.syncActivity(selectedConnection.id);
					const metadata = payload.activity.data.metadata;
					if (!metadata || Object.keys(metadata).length === 0) {
						summary.skipped += 1;
						continue;
					}
					const nextTimestamp = payload.activity.data.timestamp;
					if (!nextTimestamp || Number.isNaN(nextTimestamp)) {
						summary.skipped += 1;
						continue;
					}
					await this._db.editActivity(activity.id, {
						metadata,
						timestamp: nextTimestamp,
					});
					summary.regenerated += 1;
				} catch (error) {
					summary.failed += 1;
					summary.failures.push({
						activityId: activity.id,
						provider: selectedConnection.provider,
						providerActivityId: selectedConnection.id,
						error: (error as Error).message,
					});
				}
			}

			cursor = batch.cursor || undefined;
		} while (cursor);

		return summary;
	}
}
