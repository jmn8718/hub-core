import { type User, createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { db } from "./db";

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL) {
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(
	NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export interface AuthContext {
	externalUser: User;
	internalUserId: string;
	accessToken: string;
}

export async function requireUser(
	req: NextRequest,
): Promise<AuthContext | null> {
	const authHeader = req.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return null;
	}
	const accessToken = authHeader.replace("Bearer ", "").trim();
	if (!accessToken) return null;

	const { data, error } = await supabase.auth.getUser(accessToken);
	if (error || !data.user) {
		return null;
	}

	const resolvedUser = await db.getOrCreateAppUser({
		provider: "supabase",
		providerUserId: data.user.id,
		email: data.user.email ?? null,
		displayName:
			data.user.user_metadata?.full_name ??
			data.user.user_metadata?.name ??
			null,
	});

	return {
		externalUser: data.user,
		internalUserId: resolvedUser.userId,
		accessToken,
	};
}
