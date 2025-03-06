import { createClient } from "@supabase/supabase-js";
export type { Session as SupabaseUserSession } from "@supabase/supabase-js";

export const createSupabaseClient = (url: string, anonKey: string) =>
  createClient(url, anonKey);

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
