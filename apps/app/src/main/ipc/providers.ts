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
		// force add a client when we ask to connect
		// as it might not be added before
		manager.initializeClient(provider);
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
