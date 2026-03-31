import { readFileSync } from "node:fs";
import { join } from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import {
	BrowserWindow,
	app,
	dialog,
	nativeImage,
	screen,
	shell,
} from "electron";
import icon from "../../resources/icon.png?asset";
import { initializeClients } from "./client.js";
import { initializeDbConnection } from "./db.js";
import { storage } from "./storage.js";

function createSplashWindow(): BrowserWindow {
	const logoImage = nativeImage.createFromPath(icon);
	const logoDataUrl = logoImage.isEmpty()
		? `data:image/png;base64,${readFileSync(icon).toString("base64")}`
		: logoImage.toDataURL();
	const splashWindow = new BrowserWindow({
		width: 320,
		height: 320,
		show: false,
		frame: false,
		resizable: false,
		movable: false,
		fullscreenable: false,
		autoHideMenuBar: true,
		backgroundColor: "#f8fafc",
		...(process.platform === "linux" ? { icon } : {}),
	});

	splashWindow.once("ready-to-show", () => {
		splashWindow.show();
	});

	void splashWindow.loadURL(
		`data:text/html;charset=utf-8,${encodeURIComponent(`
			<!doctype html>
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta
						name="viewport"
						content="width=device-width, initial-scale=1.0"
					/>
					<title>Hub Core</title>
					<style>
						:root {
							color-scheme: light;
						}
						* {
							box-sizing: border-box;
						}
						body {
							margin: 0;
							background:
								radial-gradient(circle at 50% 22%, rgba(148, 163, 184, 0.16), transparent 34%),
								linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
							overflow: hidden;
						}
						.shell {
							width: 100vw;
							height: 100vh;
							display: grid;
							place-items: center;
							padding: 28px;
						}
						.card {
							width: 100%;
							height: 100%;
							display: grid;
							place-items: center;
							padding: 30px;
							border-radius: 30px;
							border: 1px solid rgba(148, 163, 184, 0.18);
							background: rgba(255, 255, 255, 0.72);
							box-shadow:
								0 18px 40px rgba(15, 23, 42, 0.08),
								inset 0 1px 0 rgba(255, 255, 255, 0.9);
							backdrop-filter: blur(10px);
						}
						.stack {
							width: 100%;
							height: 100%;
							display: flex;
							flex-direction: column;
							align-items: center;
							justify-content: center;
							gap: 24px;
						}
						.logo {
							width: 184px;
							height: 184px;
							object-fit: contain;
							filter: drop-shadow(0 10px 22px rgba(15, 23, 42, 0.08));
						}
						.bar {
							width: 100%;
							max-width: 148px;
							height: 5px;
							border-radius: 999px;
							background: rgba(203, 213, 225, 0.8);
							overflow: hidden;
						}
						.bar::after {
							content: "";
							display: block;
							height: 100%;
							width: 30%;
							border-radius: 999px;
							background: #0f172a;
							animation: pulse 1.15s ease-in-out infinite;
						}
						@keyframes pulse {
							0% { transform: translateX(-100%); }
							100% { transform: translateX(390%); }
						}
					</style>
				</head>
				<body>
					<div class="shell">
						<div class="card">
							<div class="stack">
								<img class="logo" src="${logoDataUrl}" alt="Hub Core" />
								<div class="bar"></div>
							</div>
						</div>
					</div>
				</body>
			</html>
		`)}`,
	);

	return splashWindow;
}

function createMainWindow(): BrowserWindow {
	const defaultWidth = 1247;
	const defaultHeight = 720;
	const { width: screenWidth, height: screenHeight } =
		screen.getPrimaryDisplay().workAreaSize;
	const windowWidth = Math.min(defaultWidth, screenWidth);
	const windowHeight = Math.min(defaultHeight, screenHeight);

	const mainWindow = new BrowserWindow({
		width: windowWidth,
		height: windowHeight,
		show: false,
		autoHideMenuBar: true,
		...(process.platform === "linux" ? { icon } : {}),
		webPreferences: {
			preload: join(__dirname, "../preload/index.mjs"),
			sandbox: false,
		},
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: "deny" };
	});

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
	}

	return mainWindow;
}

async function initializeAppBackend() {
	await initializeDbConnection();
	storage.initRenderer();
	await initializeClients();
}

let bootstrapPromise: Promise<void> | undefined;

async function bootstrapApplication() {
	if (bootstrapPromise) {
		return bootstrapPromise;
	}

	const splashWindow = createSplashWindow();

	bootstrapPromise = (async () => {
		try {
			await initializeAppBackend();
			const mainWindow = createMainWindow();
			mainWindow.once("ready-to-show", () => {
				splashWindow.close();
				mainWindow.show();
			});
		} catch (error) {
			splashWindow.close();
			console.error("Application startup failed", error);
			dialog.showErrorBox(
				"Startup failed",
				error instanceof Error ? error.message : "Unknown startup error",
			);
			app.quit();
		} finally {
			bootstrapPromise = undefined;
		}
	})();

	return bootstrapPromise;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// Set app user model id for windows
	electronApp.setAppUserModelId("com.electron");

	// Default open or close DevTools by F12 in development
	// and ignore CommandOrControl + R in production.
	// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	void bootstrapApplication();

	app.on("activate", () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			void bootstrapApplication();
		}
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

import "./ipc/index.js";
