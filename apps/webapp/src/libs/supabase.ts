import { createSupabaseClient } from "@repo/clients";

if (!import.meta.env.VITE_SUPABASE_URL)
  throw new Error("Missing VITE_SUPABASE_URL");
if (!import.meta.env.VITE_SUPABASE_ANON_KEY)
  throw new Error("Missing VITE_SUPABASE_ANON_KEY");

export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
