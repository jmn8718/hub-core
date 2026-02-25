import type { ProviderManager } from "@repo/clients";
import {
	type ActivitySubType,
	type ActivityType,
	type ConnectCredentials,
	type IActivityCreateInput,
	type IGearCreateInput,
	type IInbodyCreateInput,
	type IInbodyUpdateInput,
	type InbodyType,
	type ProviderSuccessResponse,
	Providers,
	type StravaClientOptions,
} from "@repo/types";
import { db } from "./db";
import { getEnvProviderConfig, getProviderManager } from "./providers";

type Payload = Record<string, unknown> | undefined;

const defaultRedirectUri =
	process.env.STRAVA_REDIRECT_URI ?? process.env.NEXT_PUBLIC_DOMAIN;

const withData = async <T>(
	fn: () => Promise<T>,
): Promise<ProviderSuccessResponse<{ data: T }>> => {
	try {
		const data = await fn();
		return {
			success: true,
			data,
		};
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
};

const withVoid = async (
	fn: () => Promise<unknown>,
): Promise<ProviderSuccessResponse> => {
	try {
		await fn();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
};

const ensureProvider = (value: unknown): Providers => {
	if (typeof value !== "string") {
		throw new Error("Invalid provider");
	}

	if (!Object.values(Providers).includes(value as Providers)) {
		throw new Error("Unsupported provider");
	}

	return value as Providers;
};

const ensureString = (value: unknown, label: string) => {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Missing ${label}`);
	}
	return value;
};

const ensureCredentials = (
	credentials?: ConnectCredentials,
): ConnectCredentials => {
	if (!credentials) {
		throw new Error("Missing provider credentials");
	}

	if ("refreshToken" in credentials) {
		if (!credentials.refreshToken) {
			throw new Error("Missing refresh token");
		}
		return { refreshToken: credentials.refreshToken };
	}

	if (!credentials.username || !credentials.password) {
		throw new Error("Missing username/password");
	}

	return {
		username: credentials.username,
		password: credentials.password,
	};
};

const normalizeStravaOptions = (options?: StravaClientOptions) => {
	if (!options?.clientId || !options?.clientSecret) {
		throw new Error("Missing Strava client configuration");
	}

	if (!options.redirectUri && !defaultRedirectUri) {
		throw new Error("Missing Strava redirect URI");
	}

	return {
		...options,
		redirectUri: options.redirectUri ?? defaultRedirectUri ?? "",
	};
};

const connectProvider = async ({
	manager,
	provider,
	credentials,
	options,
}: {
	manager: ProviderManager;
	provider: Providers;
	credentials?: ConnectCredentials;
	options?: StravaClientOptions;
}) => {
	const envConfig = getEnvProviderConfig(provider);
	if (provider === Providers.STRAVA) {
		manager.initializeClient({
			provider: Providers.STRAVA,
			options: normalizeStravaOptions(options ?? envConfig?.options),
		});
	} else {
		manager.initializeClient({ provider });
	}
	const mergedCredentials = credentials ?? envConfig?.credentials;
	const safeCredentials = ensureCredentials(mergedCredentials);
	await manager.connect(provider, safeCredentials);
};

export async function handleClientAction(
	action: string,
	payload: Payload = {},
): Promise<ProviderSuccessResponse> {
	switch (action) {
		case "getDataOverview": {
			const { limit } = payload as { limit?: number };
			return withData(() => db.getActivitiesOverview(limit));
		}
		case "getDailyOverview": {
			const { startDate, endDate, periodType, periodCount } = payload as {
				startDate?: string;
				endDate?: string;
				periodType?: "days" | "weeks" | "months";
				periodCount?: number;
			};
			return withData(() =>
				db.getDailyActivitiesOverview({
					startDate,
					endDate,
					periodType,
					periodCount,
				}),
			);
		}
		case "getWeeklyOverview": {
			const { limit } = payload as { limit?: number };
			return withData(() => db.getWeeklyActivitiesOverview(limit));
		}
		case "getActivities": {
			const params = (payload ?? {}) as {
				cursor?: string;
				limit?: number;
				offset?: number;
				type?: ActivityType;
				subtype?: ActivitySubType;
				startDate?: string;
				endDate?: string;
				search?: string;
				isEvent?: 0 | 1;
			};
			return withData(() => db.getActivities(params));
		}
		case "getActivity": {
			const { activityId } = payload as { activityId?: string };
			const id = ensureString(activityId, "activity id");
			return withData(() => db.getActivity(id));
		}
		case "createActivity": {
			const { data } = payload as { data?: IActivityCreateInput };
			if (!data || typeof data !== "object") {
				throw new Error("Missing activity payload");
			}
			const result = await db.createActivity(data);
			return { success: true, ...result };
		}
		case "editActivity": {
			const { id, data } = payload as {
				id?: string;
				data?: Record<string, unknown>;
			};
			const activityId = ensureString(id, "activity id");
			if (!data || typeof data !== "object") {
				throw new Error("Missing activity payload");
			}
			const activityData = data as Record<string, string | number | null>;
			return withVoid(async () => {
				await db.editActivity(activityId, activityData);
				if (Object.hasOwn(activityData, "notes")) {
					try {
						const manager = await getProviderManager();
						await manager.updateActivityNotes({
							activityId,
							notes: (activityData.notes as string | null | undefined) ?? null,
						});
					} catch (error) {
						console.error(error);
					}
				}
			});
		}
		case "deleteActivity": {
			const { activityId } = payload as { activityId?: string };
			const id = ensureString(activityId, "activity id");
			return withVoid(() => db.deleteActivity(id));
		}
		case "linkActivityConnection": {
			const { activityId, providerActivityId } = payload as {
				activityId?: string;
				providerActivityId?: string;
			};
			const id = ensureString(activityId, "activity id");
			const providerId = ensureString(
				providerActivityId,
				"provider activity id",
			);
			return withVoid(() => db.linkActivityConnection(id, providerId));
		}
		case "unlinkActivityConnection": {
			const { activityId, providerActivityId } = payload as {
				activityId?: string;
				providerActivityId?: string;
			};
			const id = ensureString(activityId, "activity id");
			const providerId = ensureString(
				providerActivityId,
				"provider activity id",
			);
			return withVoid(() => db.unlinkActivityConnection(id, providerId));
		}
		case "getGears": {
			const params = (payload ?? {}) as {
				cursor?: string;
				limit?: number;
				offset?: number;
			};
			return withData(() => db.getGears(params));
		}
		case "getGear": {
			const { gearId } = payload as { gearId?: string };
			const id = ensureString(gearId, "gear id");
			return withData(() => db.getGear(id));
		}
		case "createGear": {
			const { data } = payload as { data?: IGearCreateInput };
			if (!data || typeof data !== "object") {
				throw new Error("Missing gear payload");
			}
			const result = await db.createGear(data);
			return { success: true, ...result };
		}
		case "editGear": {
			const { id, data } = payload as {
				id?: string;
				data?: Record<string, unknown>;
			};
			const gearId = ensureString(id, "gear id");
			if (!data || typeof data !== "object") {
				throw new Error("Missing gear payload");
			}
			const gearData = data as Record<string, string>;
			return withVoid(() => db.editGear(gearId, gearData));
		}
		case "providerGearLink": {
			const { activityId, gearId } = payload as {
				activityId?: string;
				gearId?: string;
			};
			const id = ensureString(activityId, "activity id");
			const targetGearId = ensureString(gearId, "gear id");
			return withVoid(async () => {
				const manager = await getProviderManager();
				return manager.linkGear({ activityId: id, gearId: targetGearId });
			});
		}
		case "providerGearCreate": {
			const { provider, gearId } = payload as {
				provider?: Providers;
				gearId?: string;
			};
			const providerEnum = ensureProvider(provider);
			const targetGearId = ensureString(gearId, "gear id");
			return withVoid(async () => {
				const manager = await getProviderManager();
				await manager.createGearOnProvider({
					provider: providerEnum,
					gearId: targetGearId,
				});
			});
		}
		case "providerGearUnlink": {
			const { activityId, gearId } = payload as {
				activityId?: string;
				gearId?: string;
			};
			const id = ensureString(activityId, "activity id");
			const targetGearId = ensureString(gearId, "gear id");
			return withVoid(async () => {
				const manager = await getProviderManager();
				return manager.unlinkGear({ activityId: id, gearId: targetGearId });
			});
		}
		case "providerConnect":
		case "providerSync":
		case "providerSyncGear": {
			const { provider, credentials, options, force } = payload as {
				provider?: Providers;
				credentials?: ConnectCredentials;
				options?: StravaClientOptions;
				force?: boolean;
			};
			const providerEnum = ensureProvider(provider);
			return withVoid(async () => {
				const manager = await getProviderManager();
				await connectProvider({
					manager,
					provider: providerEnum,
					credentials,
					options,
				});
				if (action === "providerSync") {
					await manager.sync(providerEnum, Boolean(force));
					return;
				}
				if (action === "providerSyncGear") {
					await manager.syncGears(providerEnum);
					return;
				}
			});
		}
		case "getInbodyData": {
			const { type } = payload as { type?: string };
			const inbodyType = ensureString(type, "inbody type") as InbodyType;
			return withData(() =>
				db.getInbodyData({
					type: inbodyType,
				}),
			);
		}
		case "createInbodyData": {
			const { data } = payload as { data?: Record<string, unknown> };
			if (!data || typeof data !== "object") {
				throw new Error("Missing Inbody payload");
			}
			const payloadData = data as unknown as IInbodyCreateInput;
			return withData(() => db.createInbodyData(payloadData));
		}
		case "updateInbodyData": {
			const { data } = payload as { data?: Record<string, unknown> };
			if (!data || typeof data !== "object") {
				throw new Error("Missing Inbody payload");
			}
			const payloadData = data as unknown as IInbodyUpdateInput;
			return withData(() => db.updateInbodyData(payloadData));
		}
		default:
			throw new Error(`Unsupported client action: ${action}`);
	}
}
