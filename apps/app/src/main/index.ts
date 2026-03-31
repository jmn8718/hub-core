import { join } from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, dialog, screen, shell } from "electron";
import icon from "../../resources/icon.png?asset";
import { initializeClients } from "./client.js";
import { initializeDbConnection } from "./db.js";
import { storage } from "./storage.js";

function createSplashWindow(): BrowserWindow {
	const splashWindow = new BrowserWindow({
		width: 420,
		height: 260,
		show: true,
		frame: false,
		resizable: false,
		movable: false,
		fullscreenable: false,
		autoHideMenuBar: true,
		backgroundColor: "#f8fafc",
		...(process.platform === "linux" ? { icon } : {}),
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
						body {
							margin: 0;
							font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
							background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
							color: #0f172a;
						}
						.shell {
							height: 100vh;
							display: grid;
							place-items: center;
							padding: 24px;
						}
						.card {
							width: 100%;
							max-width: 320px;
							border: 1px solid #cbd5e1;
							border-radius: 20px;
							background: rgba(255, 255, 255, 0.92);
							box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
							padding: 28px 24px;
						}
						.title {
							font-size: 14px;
							font-weight: 700;
							letter-spacing: 0.08em;
							text-transform: uppercase;
							color: #334155;
							margin-bottom: 10px;
						}
						h1 {
							font-size: 28px;
							line-height: 1.1;
							margin: 0 0 12px;
						}
						p {
							margin: 0;
							font-size: 15px;
							line-height: 1.5;
							color: #475569;
						}
						.bar {
							margin-top: 18px;
							height: 6px;
							border-radius: 999px;
							background: #dbeafe;
							overflow: hidden;
						}
						.bar::after {
							content: "";
							display: block;
							height: 100%;
							width: 38%;
							border-radius: 999px;
							background: #0f172a;
							animation: pulse 1.2s ease-in-out infinite;
						}
						@keyframes pulse {
							0% { transform: translateX(-100%); }
							100% { transform: translateX(340%); }
						}
					</style>
				</head>
				<body>
					<div class="shell">
						<div class="card">
							<div class="title">Hub Core</div>
							<h1>Starting app</h1>
							<p>Loading database migrations, provider connections, and local cache.</p>
							<div class="bar"></div>
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
