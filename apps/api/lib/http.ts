import { NextResponse } from "next/server";

// Driver and infrastructure errors carry table, column and host names, and
// Drizzle's query errors embed the SQL text and its parameters. None of that
// belongs in an HTTP response. Application errors (validation, "not found",
// provider messages) are meant for the caller and pass through.
const INTERNAL_ERROR_PATTERN =
	/SQLITE_|constraint|syntax error|relation "|column "|does not exist|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|getaddrinfo|password authentication|no such table|no such column|Failed query/i;
const INTERNAL_ERROR_NAMES = new Set([
	"DrizzleQueryError",
	"LibsqlError",
	"DatabaseError",
	"AggregateError",
]);
// Node system errors (ECONNREFUSED, ENOTFOUND, EAI_AGAIN, ...), undici
// errors (UND_ERR_*), SQLite result codes (SQLITE_*) and Postgres SQLSTATEs
// (five alphanumerics, e.g. 42P01, 23505).
const INTERNAL_ERROR_CODE_PATTERN =
	/^(E[A-Z0-9_]+|UND_ERR_[A-Z_]+|ERR_[A-Z_]+|SQLITE_[A-Z_]*|[0-9A-Z]{5})$/;

function isInternalError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const candidate = error as {
		name?: unknown;
		code?: unknown;
		message?: unknown;
		constructor?: { name?: string };
	};
	const names = [candidate.name, candidate.constructor?.name].filter(
		(value): value is string => typeof value === "string",
	);
	if (names.some((name) => INTERNAL_ERROR_NAMES.has(name))) return true;
	if (
		typeof candidate.code === "string" &&
		INTERNAL_ERROR_CODE_PATTERN.test(candidate.code)
	) {
		return true;
	}
	const message =
		typeof candidate.message === "string" ? candidate.message : "";
	return INTERNAL_ERROR_PATTERN.test(message);
}

export function publicErrorMessage(error: unknown): string {
	// Walk the cause chain: Drizzle wraps the driver error, and the wrapper's
	// message includes the query and parameters; a plain wrapper may hide a
	// network error behind a harmless-looking message.
	let current: unknown = error;
	for (let depth = 0; current && depth < 6; depth += 1) {
		if (isInternalError(current)) {
			return "Internal server error";
		}
		current = (current as { cause?: unknown }).cause;
	}
	return error instanceof Error
		? error.message
		: String(error ?? "Unknown error");
}

export function errorResponse(error: unknown, status = 500) {
	console.error(error);
	return NextResponse.json(
		{ success: false, error: publicErrorMessage(error) },
		{ status },
	);
}
