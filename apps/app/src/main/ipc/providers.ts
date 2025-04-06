import { Channels, type Credentials, type Providers } from "@repo/types";
import { ipcMain } from "electron";
import { manager } from "../client.js";

ipcMain.handle(
	Channels.PROVIDERS_SYNC,
	async (
		_event,
		{
			provider,
		}: {
			provider: Providers;
		},
	) => {
		await manager.sync(provider);
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
		await manager.connect(provider, credentials);
	},
);
