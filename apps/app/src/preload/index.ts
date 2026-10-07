import { Channels } from "@repo/types";
import { contextBridge, ipcRenderer } from "electron";

// The renderer only ever needs to invoke known IPC channels and read the
// runtime versions. Nothing else from the preload environment (process.env,
// raw ipcRenderer, webFrame) is exposed.
const allowedChannels = new Set<string>(Object.values(Channels));

const electronBridge = {
	ipcRenderer: {
		invoke: (channel: string, ...args: unknown[]) => {
			if (!allowedChannels.has(channel)) {
				return Promise.reject(new Error(`Unknown IPC channel: ${channel}`));
			}
			return ipcRenderer.invoke(channel, ...args);
		},
	},
	process: {
		platform: process.platform,
		versions: { ...process.versions },
	},
};

export type ElectronBridge = typeof electronBridge;

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("electron", electronBridge);
	} catch (error) {
		console.error(error);
	}
} else {
	// @ts-ignore (define in dts)
	window.electron = electronBridge;
}
