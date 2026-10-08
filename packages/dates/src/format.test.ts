import { describe, expect, test } from "vitest";
import {
	dateWithTimezoneToUTC,
	formatDate,
	isValidTimezone,
} from "./format.js";

const INSTANT = "2026-10-07T10:00:00.000Z";

describe("formatDate", () => {
	test("keeps the instant when converting strings to an IANA zone", () => {
		expect(
			formatDate(INSTANT, {
				format: "YYYY-MM-DD HH:mm",
				timezone: "Asia/Seoul",
			}),
		).toBe("2026-10-07 19:00");
		expect(
			formatDate(INSTANT, { format: "HH:mm", timezone: "America/New_York" }),
		).toBe("06:00");
	});

	test("treats zone-less strings as UTC, like database text timestamps", () => {
		expect(
			formatDate("2026-10-07 10:00:00", {
				format: "YYYY-MM-DD HH:mm",
				timezone: "Asia/Seoul",
			}),
		).toBe("2026-10-07 19:00");
		expect(
			formatDate("2026-10-07T10:00:00", {
				format: "HH:mm",
				timezone: "UTC+09:00",
			}),
		).toBe("19:00");
	});

	test("agrees between numbers, Dates and strings", () => {
		const options = { format: "YYYY-MM-DD HH:mm", timezone: "Asia/Tokyo" };
		expect(formatDate(Date.parse(INSTANT), options)).toBe("2026-10-07 19:00");
		expect(formatDate(new Date(INSTANT), options)).toBe("2026-10-07 19:00");
		expect(formatDate(INSTANT, options)).toBe("2026-10-07 19:00");
	});

	test("supports UTC offset timezones and respects explicit offsets in strings", () => {
		expect(
			formatDate(INSTANT, { format: "HH:mm", timezone: "UTC+09:00" }),
		).toBe("19:00");
		expect(
			formatDate("2026-10-07T19:00:00+09:00", {
				format: "HH:mm",
				timezone: "UTC+00:00",
			}),
		).toBe("10:00");
	});

	test("falls back to local time instead of throwing on an invalid zone", () => {
		expect(() => formatDate(INSTANT, { timezone: "GMT+9" })).not.toThrow();
		expect(formatDate(INSTANT, { format: "YYYY", timezone: "Not/AZone" })).toBe(
			"2026",
		);
		expect(isValidTimezone("Asia/Seoul")).toBe(true);
		expect(isValidTimezone("UTC+09:00")).toBe(true);
		expect(isValidTimezone("GMT+9")).toBe(false);
		expect(isValidTimezone("")).toBe(false);
	});
});

describe("dateWithTimezoneToUTC", () => {
	test("interprets a wall-clock string in the given zone", () => {
		expect(
			dateWithTimezoneToUTC("2026-10-07T19:00", "Asia/Seoul").toISOString(),
		).toBe(INSTANT);
		expect(
			dateWithTimezoneToUTC("2026-10-07T19:00", "UTC+09:00").toISOString(),
		).toBe(INSTANT);
	});

	test("round-trips with formatDate", () => {
		const wallClock = formatDate(INSTANT, {
			format: "YYYY-MM-DDTHH:mm:ss",
			timezone: "Europe/Madrid",
		});
		expect(
			dateWithTimezoneToUTC(wallClock, "Europe/Madrid").toISOString(),
		).toBe(INSTANT);
	});

	test("does not throw on an invalid zone", () => {
		expect(() =>
			dateWithTimezoneToUTC("2026-10-07T19:00", "GMT+9"),
		).not.toThrow();
	});
});

describe("dateWithTimezoneToUTC with offset zones", () => {
	test("gives the same instant for negative offsets and half-hour zones", () => {
		expect(
			dateWithTimezoneToUTC("2026-10-07T06:00", "UTC-04:00").toISOString(),
		).toBe(INSTANT);
		expect(
			dateWithTimezoneToUTC("2026-10-07T15:30", "UTC+05:30").toISOString(),
		).toBe(INSTANT);
	});
});
