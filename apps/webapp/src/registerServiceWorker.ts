const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(
	window.location.hostname,
);

const PWA_UPDATE_AVAILABLE_EVENT = "hub-core:pwa-update-available";

const notifyUpdateAvailable = (registration: ServiceWorkerRegistration) => {
	window.dispatchEvent(
		new CustomEvent(PWA_UPDATE_AVAILABLE_EVENT, {
			detail: {
				registration,
			},
		}),
	);
};

export function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) {
		return;
	}

	let refreshing = false;
	navigator.serviceWorker.addEventListener("controllerchange", () => {
		if (refreshing) {
			return;
		}

		refreshing = true;
		window.location.reload();
	});

	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js")
			.then((registration) => {
				if (registration.waiting) {
					notifyUpdateAvailable(registration);
				}

				registration.addEventListener("updatefound", () => {
					const installingWorker = registration.installing;
					if (!installingWorker) {
						return;
					}

					installingWorker.addEventListener("statechange", () => {
						if (
							installingWorker.state === "installed" &&
							navigator.serviceWorker.controller
						) {
							notifyUpdateAvailable(registration);
						}
					});
				});

				if (!isLocalhost) {
					return;
				}

				registration.update().catch(() => {
					// Development-only update checks should not affect app startup.
				});
			})
			.catch((error: unknown) => {
				if (isLocalhost) {
					console.warn("Service worker registration failed", error);
				}
			});
	});
}
