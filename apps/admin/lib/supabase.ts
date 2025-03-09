import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Server-side client
export const createServerSupabaseClient = () =>
	createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
	);

// Client-side helper
export const createBrowserSupabaseClient = createClientComponentClient;
