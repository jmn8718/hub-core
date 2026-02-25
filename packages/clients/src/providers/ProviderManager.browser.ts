import type { Db } from "@repo/db";
import type { ConnectCredentials } from "@repo/types";
import type { Providers } from "@repo/types";

/**
 * Minimal browser stub that mirrors the ProviderManager API used by WebClient.
 * The real provider integrations rely on Node.js APIs and can only run in the
 * desktop application or server environment.
 */
export class ProviderManager {
	constructor(_db: Db, _dirname?: string) {
		if (typeof window !== "undefined") {
			console.warn(
				"ProviderManager: provider integrations are not available in the browser build.",
			);
		}
	}

	initializeClient(_provider: Providers) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	connect(_provider: Providers, _credentials: ConnectCredentials) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	syncGears(_provider: Providers) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	createGearOnProvider(_params: { provider: Providers; gearId: string }) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	sync(_provider: Providers, _force?: boolean) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	syncActivity(_provider: Providers, _activityId: string) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	linkGear(_params: { gearId: string; activityId: string }) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	unlinkGear(_params: { gearId: string; activityId: string }) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	uploadActivityFile(_params: {
		provider: Providers;
		providerActivityId: string;
		target: Providers;
		downloadPath: string;
	}) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	downloadActivityFile(_params: {
		provider: Providers;
		providerActivityId: string;
		downloadPath: string;
	}) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	exportActivityManual(_params: { target: Providers; activityId: string }) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	gearStatusUpdate(_params: {
		provider: Providers;
		providerUuid: string;
		status: "active" | "retired";
		dateEnd?: Date;
	}) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	updateActivityNotes(_params: {
		activityId: string;
		notes?: string | null;
	}) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	updateActivityName(_params: {
		activityId: string;
		name?: string | null;
	}) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	linkActivityGear(_activityId: string, _providerGearId: string) {
		throw new Error("Provider integrations are not available in the browser.");
	}

	unlinkActivityGear(_activityId: string, _providerGearId: string) {
		throw new Error("Provider integrations are not available in the browser.");
	}
}
