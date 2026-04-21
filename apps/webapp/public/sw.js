const CACHE_VERSION = "hub-core-pwa-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_URLS = [
	"/",
	"/index.html",
	"/favicon.ico",
	"/manifest.webmanifest",
	"/pwa-icon-192.png",
	"/pwa-icon-512.png",
	"/pwa-maskable-512.png",
	"/splash-icon.png",
];

const isSameOrigin = (url) => url.origin === self.location.origin;
const isNavigationRequest = (request) => request.mode === "navigate";
const isCacheableAsset = (request, url) => {
	if (request.method !== "GET" || !isSameOrigin(url)) {
		return false;
	}

	if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
		return false;
	}

	return [
		"document",
		"font",
		"image",
		"manifest",
		"script",
		"style",
		"worker",
	].includes(request.destination);
};

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(APP_SHELL_CACHE)
			.then((cache) => cache.addAll(APP_SHELL_URLS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) =>
				Promise.all(
					cacheNames
						.filter((cacheName) => !cacheName.startsWith(CACHE_VERSION))
						.map((cacheName) => caches.delete(cacheName)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	if (isNavigationRequest(request)) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const responseClone = response.clone();
					caches.open(APP_SHELL_CACHE).then((cache) => {
						cache.put("/index.html", responseClone);
					});
					return response;
				})
				.catch(() => caches.match("/index.html")),
		);
		return;
	}

	if (!isCacheableAsset(request, url)) {
		return;
	}

	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}

			return fetch(request).then((response) => {
				if (!response || response.status !== 200) {
					return response;
				}

				const responseClone = response.clone();
				caches.open(RUNTIME_CACHE).then((cache) => {
					cache.put(request, responseClone);
				});

				return response;
			});
		}),
	);
});
