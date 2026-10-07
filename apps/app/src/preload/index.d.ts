import type { ElectronBridge } from "./index";

declare global {
	interface Window {
		electron: ElectronBridge;
	}
}
