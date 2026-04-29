import { useEffect, useState } from "react";

import { supabase } from "@/libs/supabase.js";
import Login from "@/login.js";
import { App } from "@repo/app";
import { type SupabaseUserSession, WebClient } from "@repo/clients";
import { AppType } from "@repo/types";

if (!import.meta.env.VITE_API_URL) {
	throw new Error("Missing VITE_API_URL");
}

const PWA_UPDATE_AVAILABLE_EVENT = "hub-core:pwa-update-available";

const client = new WebClient({
	apiBaseUrl: import.meta.env.VITE_API_URL,
	supabase,
	supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
});

type BootState = "ready" | "offline-no-cache";

type WebAppProps = {
	initialSession: SupabaseUserSession | null;
	initialBootState: BootState;
};

function OfflineStartupError() {
	return (
		<main className="grid min-h-screen place-items-center bg-slate-50 px-6 py-10 text-slate-900">
			<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
				<div className="space-y-3">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
						Connection required
					</p>
					<h1 className="text-2xl font-semibold tracking-tight text-slate-950">
						No internet connection
					</h1>
					<p className="text-sm leading-6 text-slate-600">
						This device is offline and no saved data is available yet. Connect
						to the internet to sign in and sync data, then this screen will be
						available offline next time.
					</p>
				</div>
				<div className="mt-6 flex gap-3">
					<button
						type="button"
						className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
						onClick={() => window.location.reload()}
					>
						Retry
					</button>
				</div>
			</div>
		</main>
	);
}

export default function WebApp({
	initialSession,
	initialBootState,
}: WebAppProps) {
	const [userSession, setUserSession] = useState<SupabaseUserSession | null>(
		initialSession,
	);
	const [bootState, setBootState] = useState<BootState>(initialBootState);
	const [waitingRegistration, setWaitingRegistration] =
		useState<ServiceWorkerRegistration | null>(null);

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUserSession(session);
			setBootState("ready");
		});

		return () => subscription.unsubscribe();
	}, []);

	useEffect(() => {
		const handleUpdateAvailable = (event: Event) => {
			if (!(event instanceof CustomEvent)) {
				return;
			}

			const registration = event.detail?.registration;
			if (registration instanceof ServiceWorkerRegistration) {
				setWaitingRegistration(registration);
			}
		};

		window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);

		return () => {
			window.removeEventListener(
				PWA_UPDATE_AVAILABLE_EVENT,
				handleUpdateAvailable,
			);
		};
	}, []);

	const handleUpdateClick = () => {
		waitingRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" });
	};

	return (
		<>
			{bootState === "offline-no-cache" ? (
				<OfflineStartupError />
			) : userSession ? (
				<App client={client} type={AppType.WEB} />
			) : (
				<Login />
			)}
			{waitingRegistration?.waiting && (
				<div className="fixed inset-x-3 bottom-4 z-[60] mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm font-medium">A new version is available.</p>
						<button
							type="button"
							className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
							onClick={handleUpdateClick}
						>
							Update now
						</button>
					</div>
				</div>
			)}
		</>
	);
}
