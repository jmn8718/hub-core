import { Channels, type Providers } from "@repo/types";
import { ipcMain } from "electron";
import { manager } from "../client.js";

ipcMain.handle(
	Channels.PROVIDERS_GEAR_STATUS_UPDATE,
	async (
		_event,
		params: {
			provider: Providers;
			providerUuid: string;
			status: "active" | "retired";
			dateEnd?: string;
		},
	) => {
		return manager.gearStatusUpdate({
			...params,
			dateEnd: params.dateEnd ? new Date(params.dateEnd) : undefined,
		});
	},
);
