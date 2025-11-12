import { useEffect, useState } from "react";

import { FullPageLoader } from "@/components/FullPageLoader.js";
import { supabase } from "@/libs/supabase.js";
import Login from "@/login.js";
import { App } from "@repo/app";
import { type SupabaseUserSession, WebClient } from "@repo/clients";
import { AppType } from "@repo/types";

if (!import.meta.env.VITE_API_URL) {
	throw new Error("Missing VITE_API_URL");
}

const client = new WebClient({
	apiBaseUrl: import.meta.env.VITE_API_URL,
	supabase,
});

export default function WebApp() {
	const [userSession, setUserSession] = useState<SupabaseUserSession | null>(
		null,
	);
	const [ready, setReady] = useState(false);
	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUserSession(session);
			setReady(true);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUserSession(session);
			setReady(true);
		});

		return () => subscription.unsubscribe();
	}, []);

	if (!ready) {
		return <FullPageLoader />;
	}

	return userSession ? <App client={client} type={AppType.WEB} /> : <Login />;
}
