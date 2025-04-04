import type { Providers } from "@repo/types";
import type { Client } from "./Client.js";

export class ProviderManager {
	// @ts-expect-error no need to initialize with undefined
	private _clients: Record<Providers, Client | undefined> = {};

	public addClient(provider: Providers, client: Client) {
		this._clients[provider] = client;
	}

	public getProvider(provider: Providers) {
		if (!this._clients[provider])
			throw new Error(`${provider} not initialized`);
		return this._clients[provider];
	}
}
