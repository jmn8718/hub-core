import { ProviderManager } from "@repo/clients";
import type { ConnectCredentials, StravaClientOptions } from "@repo/types";
import { Providers } from "@repo/types";
import { cacheDb, db } from "./db";

type ProviderConfig = {
	credentials: ConnectCredentials;
	options?: StravaClientOptions;
};

const manager = new ProviderManager(db, cacheDb);

const envProviderConfigs: Partial<Record<Providers, ProviderConfig>> = {};

const addConfig = (
	provider: Providers,
	config: ProviderConfig,
): ProviderConfig => {
	envProviderConfigs[provider] = config;
	return config;
};

const { COROS_USERNAME, COROS_PASSWORD } = process.env;
if (COROS_USERNAME && COROS_PASSWORD) {
	console.log("initializing coros from env");
	addConfig(Providers.COROS, {
		credentials: {
			username: COROS_USERNAME,
			password: COROS_PASSWORD,
		},
	});
} else {
	console.log("coros env vars not set");
}

const { GARMIN_USERNAME, GARMIN_PASSWORD } = process.env;
if (GARMIN_USERNAME && GARMIN_PASSWORD) {
	console.log("initializing garmin from env");
	addConfig(Providers.GARMIN, {
		credentials: {
			username: GARMIN_USERNAME,
			password: GARMIN_PASSWORD,
		},
	});
} else {
	console.log("garmin env vars not set");
}

const {
	STRAVA_CLIENT_ID,
	STRAVA_CLIENT_SECRET,
	STRAVA_REFRESH_TOKEN,
	STRAVA_REDIRECT_URI,
	NEXT_PUBLIC_DOMAIN,
} = process.env;

if (STRAVA_CLIENT_ID && STRAVA_CLIENT_SECRET) {
	console.log("initializing strava from env");
	addConfig(Providers.STRAVA, {
		credentials: {
			refreshToken: STRAVA_REFRESH_TOKEN || "",
		},
		options: {
			clientId: STRAVA_CLIENT_ID,
			clientSecret: STRAVA_CLIENT_SECRET,
			redirectUri: STRAVA_REDIRECT_URI ?? NEXT_PUBLIC_DOMAIN ?? "",
		},
	});
} else {
	console.log("strava env vars not set");
}

let initializePromise: Promise<void> | null = null;

async function initializeFromEnv() {
	const entries = Object.entries(envProviderConfigs) as [
		Providers,
		ProviderConfig,
	][];
	await Promise.all(
		entries.map(async ([provider, config]) => {
			try {
				if (provider === Providers.STRAVA && config.options) {
					manager.initializeClient({
						provider: Providers.STRAVA,
						options: config.options,
					});
				} else if (
					provider === Providers.COROS ||
					provider === Providers.GARMIN
				) {
					manager.initializeClient({ provider });
				}
				await manager.connect(provider, config.credentials);
			} catch (error) {
				console.error(`Failed to initialize provider ${provider}`, error);
			}
		}),
	);
}

export async function getProviderManager() {
	if (!initializePromise) {
		initializePromise = initializeFromEnv().catch((error) => {
			console.error("Provider initialization error", error);
		});
	}
	await initializePromise.catch((error) => {
		console.error("Provider initialization error", error);
	});
	return manager;
}

export function getEnvProviderConfig(provider: Providers) {
	return envProviderConfigs[provider];
}
