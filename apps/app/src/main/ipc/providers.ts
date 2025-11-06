import {
	type ApiClientCredentials,
	Channels,
	type Credentials,
	type LoginCredentials,
	Providers,
} from "@repo/types";
import { ipcMain } from "electron";
import { manager } from "../client.js";
import {
	STRAVA_CLIENT_ID,
	STRAVA_CLIENT_SECRET,
	STRAVA_REDIRECT_URI,
} from "../config.js";

function isLoginCredentials(
	credentials: Credentials,
): credentials is LoginCredentials {
	return (
		typeof (credentials as LoginCredentials).username === "string" &&
		typeof (credentials as LoginCredentials).password === "string"
	);
}

function isApiClientCredentials(
	credentials: Credentials,
): credentials is ApiClientCredentials {
	return typeof (credentials as ApiClientCredentials).refreshToken === "string";
}

function ensureProviderInitialized(provider: Providers) {
	if (provider === Providers.STRAVA) {
		manager.initializeClient(provider, {
			clientId: STRAVA_CLIENT_ID,
			clientSecret: STRAVA_CLIENT_SECRET,
			redirectUri: STRAVA_REDIRECT_URI,
		});
		return;
	}

	manager.initializeClient(provider);
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
		}: {
			provider: Providers;
			credentials: Credentials;
		},
	) => {
		// force add a client when we ask to connect
		// as it might not be added before
		ensureProviderInitialized(provider);
		if (provider === Providers.STRAVA) {
			if (!isApiClientCredentials(credentials)) {
				throw new Error("Invalid Strava credentials");
			}
			await manager.connect(provider, credentials);
			return;
		}
		if (!isLoginCredentials(credentials)) {
			throw new Error("Invalid credentials");
		}
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
