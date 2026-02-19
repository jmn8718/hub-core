import {
	Channels,
	type ConnectCredentials,
	type LoginCredentials,
	Providers,
	type StravaClientOptions,
	type StravaCredentials,
} from "@repo/types";
import { ipcMain } from "electron";
import { manager } from "../client.js";

function isLoginCredentials(
	credentials: ConnectCredentials,
): credentials is LoginCredentials {
	return (
		typeof (credentials as LoginCredentials).username === "string" &&
		typeof (credentials as LoginCredentials).password === "string"
	);
}

function isStravaCredentials(
	credentials: ConnectCredentials,
): credentials is StravaCredentials {
	return typeof (credentials as StravaCredentials).refreshToken === "string";
}

function ensureProviderInitialized(
	provider: Providers,
	credentials?: StravaClientOptions,
) {
	if (provider === Providers.STRAVA) {
		if (!credentials) {
			throw new Error("Invalid Strava credentials");
		}
		const { clientId, clientSecret, redirectUri } = credentials;
		if (!clientId || !clientSecret) {
			throw new Error("Missing Strava client ID or client secret");
		}
		manager.initializeClient({
			provider,
			options: {
				clientId,
				clientSecret,
				redirectUri,
			},
		});
		return;
	}

	manager.initializeClient({ provider });
}

ipcMain.handle(
	Channels.PROVIDERS_SYNC,
	async (
		_event,
		{
			provider,
			force = false,
		}: {
			provider: Providers;
			force?: boolean;
		},
	) => {
		await manager.sync(provider, force);
	},
);

ipcMain.handle(
	Channels.PROVIDERS_CONNECT,
	async (
		_event,
		{
			provider,
			credentials,
			options,
		}: {
			provider: Providers;
			credentials: ConnectCredentials;
			options?: StravaClientOptions;
		},
	) => {
		// force add a client when we ask to connect
		// as it might not be added before
		if (provider === Providers.STRAVA) {
			if (!isStravaCredentials(credentials)) {
				throw new Error("Invalid Strava credentials");
			}
			if (!options) {
				throw new Error("Missing Strava client options");
			}
			// we can not initialize before as we need the options from credentials
			// so if strava client is not initialized, it will fail on connect
			ensureProviderInitialized(provider, options);
			await manager.connect(provider, credentials);
			return;
		}
		if (!isLoginCredentials(credentials)) {
			throw new Error("Invalid credentials");
		}
		ensureProviderInitialized(provider);
		await manager.connect(provider, credentials);
	},
);

ipcMain.handle(
	Channels.PROVIDERS_SYNC_GEAR,
	async (
		_event,
		{
			provider,
		}: {
			provider: Providers;
		},
	) => {
		await manager.syncGears(provider);
	},
);

ipcMain.handle(
	Channels.PROVIDERS_GEAR_CREATE,
	async (
		_event,
		{
			provider,
			gearId,
		}: {
			provider: Providers;
			gearId: string;
		},
	) => {
		await manager.createGearOnProvider({ provider, gearId });
	},
);

ipcMain.handle(
	Channels.PROVIDERS_GEAR_LINK,
	async (
		_event,
		{
			gearId,
			activityId,
		}: {
			gearId: string;
			activityId: string;
		},
	) => {
		await manager.linkGear({
			gearId,
			activityId,
		});
	},
);

ipcMain.handle(
	Channels.PROVIDERS_GEAR_UNLINK,
	async (
		_event,
		{
			gearId,
			activityId,
		}: {
			gearId: string;
			activityId: string;
		},
	) => {
		await manager.unlinkGear({
			gearId,
			activityId,
		});
	},
);
