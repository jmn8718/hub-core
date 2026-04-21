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
});

type WebAppProps = {
	initialSession: SupabaseUserSession | null;
};

export default function WebApp({ initialSession }: WebAppProps) {
	const [userSession, setUserSession] = useState<SupabaseUserSession | null>(
		initialSession,
	);
	const [waitingRegistration, setWaitingRegistration] =
		useState<ServiceWorkerRegistration | null>(null);

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUserSession(session);
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
			{userSession ? <App client={client} type={AppType.WEB} /> : <Login />}
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
