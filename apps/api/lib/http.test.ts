import { describe, expect, test } from "vitest";
import { publicErrorMessage } from "./http";

class DrizzleQueryError extends Error {
	constructor(
		message: string,
		public cause?: unknown,
	) {
		super(message);
		this.name = "DrizzleQueryError";
	}
}

const withCode = (message: string, code: string) =>
	Object.assign(new Error(message), { code });

describe("publicErrorMessage", () => {
	test("masks a Drizzle query error that embeds SQL and parameters", () => {
		const driver = withCode('relation "activities" does not exist', "42P01");
		const wrapped = new DrizzleQueryError(
			'Failed query: insert into "activities" ... params: ["secret-id"]',
			driver,
		);
		expect(publicErrorMessage(wrapped)).toBe("Internal server error");
	});

	test("masks a neutral wrapper whose cause is a network error code", () => {
		const cause = withCode("request failed", "ECONNREFUSED");
		const error = new Error("request failed", { cause });
		expect(publicErrorMessage(error)).toBe("Internal server error");
		expect(
			publicErrorMessage(
				new Error("fetch failed", {
					cause: withCode("getaddrinfo failed", "ENOTFOUND"),
				}),
			),
		).toBe("Internal server error");
		expect(
			publicErrorMessage(
				new Error("timeout", { cause: withCode("dns", "EAI_AGAIN") }),
			),
		).toBe("Internal server error");
	});

	test("masks driver errors by code even with a bland message", () => {
		expect(publicErrorMessage(withCode("oops", "23505"))).toBe(
			"Internal server error",
		);
		expect(publicErrorMessage(withCode("oops", "SQLITE_BUSY"))).toBe(
			"Internal server error",
		);
		expect(publicErrorMessage(withCode("oops", "UND_ERR_SOCKET"))).toBe(
			"Internal server error",
		);
	});

	test("masks deep causes but stops walking after a few levels", () => {
		let error: Error = withCode("root", "ECONNRESET");
		for (let depth = 0; depth < 3; depth += 1) {
			error = new Error(`layer ${depth}`, { cause: error });
		}
		expect(publicErrorMessage(error)).toBe("Internal server error");
	});

	test("lets application and validation messages through", () => {
		expect(publicErrorMessage(new Error("Missing activity"))).toBe(
			"Missing activity",
		);
		expect(publicErrorMessage(new Error("Invalid sync limit"))).toBe(
			"Invalid sync limit",
		);
		expect(
			publicErrorMessage(
				new Error("Sync rows belong to another user: 1 row(s) in gears"),
			),
		).toBe("Sync rows belong to another user: 1 row(s) in gears");
		expect(publicErrorMessage("boom")).toBe("boom");
		expect(publicErrorMessage(undefined)).toBe("Unknown error");
	});
});
