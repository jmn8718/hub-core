import { type Session, createClient } from "@supabase/supabase-js";
export type { Session as SupabaseUserSession } from "@supabase/supabase-js";

export const createSupabaseClient = (url: string, anonKey: string) =>
	createClient(url, anonKey);

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;

type SessionStorageLike = Pick<Storage, "getItem" | "key" | "length">;

const SESSION_TIMEOUT = Symbol("SESSION_TIMEOUT");

function getDefaultStorage(): SessionStorageLike | null {
	if (typeof localStorage === "undefined") {
		return null;
	}
	return localStorage;
}

function getSupabaseStorageKey(url: string): string | null {
	try {
		const projectRef = new URL(url).hostname.split(".")[0];
		return projectRef ? `sb-${projectRef}-auth-token` : null;
	} catch {
		return null;
	}
}

function isSessionLike(value: unknown): value is Session {
	if (!value || typeof value !== "object") {
		return false;
	}

	const session = value as Partial<Session>;
	return (
		typeof session.access_token === "string" &&
		!!session.user &&
		typeof session.user === "object" &&
		typeof session.user.id === "string"
	);
}

function findSessionCandidate(
	value: unknown,
	depth = 0,
	visited = new WeakSet<object>(),
): Session | null {
	if (isSessionLike(value)) {
		return value;
	}

	if (!value || typeof value !== "object" || depth > 6) {
		return null;
	}

	if (visited.has(value as object)) {
		return null;
	}
	visited.add(value as object);

	if (Array.isArray(value)) {
		for (const item of value) {
			const match = findSessionCandidate(item, depth + 1, visited);
			if (match) return match;
		}
		return null;
	}

	for (const item of Object.values(value as Record<string, unknown>)) {
		const match = findSessionCandidate(item, depth + 1, visited);
		if (match) return match;
	}

	return null;
}

function parseStoredSession(raw: string | null): Session | null {
	if (!raw) {
		return null;
	}

	try {
		return findSessionCandidate(JSON.parse(raw));
	} catch {
		return null;
	}
}

export function readPersistedSupabaseSession(
	url: string,
	storage: SessionStorageLike | null = getDefaultStorage(),
): Session | null {
	if (!storage) {
		return null;
	}

	const exactKey = getSupabaseStorageKey(url);
	if (exactKey) {
		const exactMatch = parseStoredSession(storage.getItem(exactKey));
		if (exactMatch) {
			return exactMatch;
		}
	}

	for (let index = 0; index < storage.length; index += 1) {
		const key = storage.key(index);
		if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) {
			continue;
		}

		const match = parseStoredSession(storage.getItem(key));
		if (match) {
			return match;
		}
	}

	return null;
}

export async function resolveSupabaseSession(params: {
	supabase: SupabaseClient;
	supabaseUrl: string;
	timeoutMs?: number;
}): Promise<Session | null> {
	const { supabase, supabaseUrl, timeoutMs = 1500 } = params;

	const result = await Promise.race([
		supabase.auth
			.getSession()
			.then(({ data, error }) => (error ? null : (data.session ?? null)))
			.catch(() => null),
		new Promise<typeof SESSION_TIMEOUT>((resolve) => {
			globalThis.setTimeout(() => resolve(SESSION_TIMEOUT), timeoutMs);
		}),
	]);

	if (result !== SESSION_TIMEOUT) {
		return result;
	}

	return readPersistedSupabaseSession(supabaseUrl);
}
