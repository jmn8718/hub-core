import { type User, createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
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

function parseList(value: string | undefined) {
	return new Set(
		(value ?? "")
			.split(",")
			.map((entry) => entry.trim().toLowerCase())
			.filter(Boolean),
	);
}

// The data routes under /api/client, /api/provider-files and
// /api/strava/subscriptions operate on a single shared data set and on the
// provider credentials configured for this deployment. They are therefore
// restricted to an explicit allow-list of Supabase users. Sync routes are
// scoped per user and stay on requireUser.
const allowedEmails = parseList(process.env.API_ALLOWED_EMAILS);
const allowedUserIds = parseList(process.env.API_ALLOWED_USER_IDS);
let warnedAboutEmptyAllowList = false;

export function isAllowedUser(user: User) {
	if (allowedEmails.size === 0 && allowedUserIds.size === 0) {
		if (!warnedAboutEmptyAllowList) {
			warnedAboutEmptyAllowList = true;
			console.error(
				"API_ALLOWED_EMAILS / API_ALLOWED_USER_IDS are not set; data routes reject every user",
			);
		}
		return false;
	}
	const email = user.email?.trim().toLowerCase();
	return (
		allowedUserIds.has(user.id.toLowerCase()) ||
		(!!email && allowedEmails.has(email))
	);
}

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

/**
 * Like requireUser, but additionally requires the Supabase user to be on the
 * deployment allow-list. Returns a ready-to-send 401/403 response otherwise.
 */
export async function requireAllowedUser(
	req: NextRequest,
): Promise<AuthContext | NextResponse> {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}
	if (!isAllowedUser(authContext.externalUser)) {
		return NextResponse.json(
			{ success: false, error: "Forbidden" },
			{ status: 403 },
		);
	}
	return authContext;
}
