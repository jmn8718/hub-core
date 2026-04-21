const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(
	window.location.hostname,
);

export function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) {
		return;
	}

	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js")
			.then((registration) => {
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
