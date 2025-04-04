import { Channels, type Providers } from "@repo/types";
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
		const client = manager.getProvider(provider);
		await client.sync();
	},
);
