import { useEffect, useState } from "react";

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
	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUserSession(session);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUserSession(session);
		});

		return () => subscription.unsubscribe();
	}, []);

	return userSession ? <App client={client} type={AppType.WEB} /> : <Login />;
}
