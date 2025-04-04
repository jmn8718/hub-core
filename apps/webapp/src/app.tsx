import { useEffect, useState } from "react";

import { db } from "@/libs/db.js";
import { manager } from "@/libs/providers.js";
import { supabase } from "@/libs/supabase.js";
import Login from "@/login.js";
import { App } from "@repo/app";
import { type SupabaseUserSession, WebClient } from "@repo/clients";
import { AppType } from "@repo/types";

const client = new WebClient(supabase, db, manager);

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
