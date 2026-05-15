import { createSupabaseClient } from "@repo/clients";

export function getCloudConfig() {
	const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
	const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
	const apiBaseUrl = import.meta.env.VITE_API_URL;

	if (!supabaseUrl || !supabaseAnonKey || !apiBaseUrl) {
		return null;
	}

	return {
		supabaseUrl,
		supabaseAnonKey,
		apiBaseUrl,
		supabase: createSupabaseClient(supabaseUrl, supabaseAnonKey),
	};
}
