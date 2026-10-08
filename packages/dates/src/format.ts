import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { DateParam } from "./types.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const UTC_OFFSET_TIMEZONE_PATTERN =
	/^UTC(?<sign>[+-])(?<hours>\d{2}):(?<minutes>\d{2})$/;

function parseUtcOffsetTimezone(timezoneValue?: string) {
	if (!timezoneValue) {
		return null;
	}

	const match = UTC_OFFSET_TIMEZONE_PATTERN.exec(timezoneValue);
	if (!match?.groups) {
		return null;
	}

	const hoursGroup = match.groups.hours;
	const minutesGroup = match.groups.minutes;
	const signGroup = match.groups.sign;
	if (!hoursGroup || !minutesGroup || !signGroup) {
		return null;
	}

	const hours = Number.parseInt(hoursGroup, 10);
	const minutes = Number.parseInt(minutesGroup, 10);
	if (Number.isNaN(hours) || Number.isNaN(minutes)) {
		return null;
	}

	const direction = signGroup === "-" ? -1 : 1;
	return direction * (hours * 60 + minutes);
}

const timezoneValidity = new Map<string, boolean>();

/**
 * True for IANA zone names the runtime knows. Provider payloads are the
 * source of stored timezones, so an unknown or malformed value must degrade
 * to local time instead of throwing in the middle of a render.
 */
export function isValidTimezone(timezoneValue?: string | null): boolean {
	if (!timezoneValue) return false;
	if (parseUtcOffsetTimezone(timezoneValue) !== null) return true;
	const cached = timezoneValidity.get(timezoneValue);
	if (cached !== undefined) return cached;
	let valid = false;
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezoneValue });
		valid = true;
	} catch {
		valid = false;
	}
	timezoneValidity.set(timezoneValue, valid);
	return valid;
}

/**
 * The instant a DateParam refers to. Numbers and Dates are instants already.
 * Strings with an explicit offset or Z are parsed as written; strings without
 * one (SQL timestamps such as "2026-10-07 10:00:00", ISO without zone) are
 * taken as UTC, which is how every text timestamp in the database is stored.
 */
function toInstant(dateParam: DateParam) {
	if (typeof dateParam !== "string") {
		return dayjs(dateParam);
	}
	const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateParam.trim());
	return hasExplicitZone ? dayjs(dateParam) : dayjs.utc(dateParam);
}

function withTimezone(dateParam: DateParam, timezoneValue?: string) {
	if (!timezoneValue) {
		// No zone requested: the viewer's local time, as before.
		return dayjs(dateParam);
	}
	const offsetMinutes = parseUtcOffsetTimezone(timezoneValue);
	if (offsetMinutes !== null) {
		return toInstant(dateParam).utcOffset(offsetMinutes);
	}
	if (!isValidTimezone(timezoneValue)) {
		return dayjs(dateParam);
	}
	return toInstant(dateParam).tz(timezoneValue);
}

export function formatDate(
	dateParam: DateParam,
	options?: {
		format?: string;
		timezone?: string;
	},
): string {
	const format = options?.format || "YYYY/MM/DD";
	const date = withTimezone(dateParam, options?.timezone);
	return date.format(format);
}

export const formatRelativeTime = (date: string | Date): string => {
	return dayjs(date).fromNow();
};

export const formatDateWithTime = (
	date: DateParam,
	timezone?: string,
): string => {
	return formatDate(date, {
		format: "YYYY-MM-DD HH:mm",
		timezone,
	});
};

/**
 * Interprets a wall-clock string ("2026-10-07T08:25" or "2026-10-07 08:25:00")
 * as a time in `timezone` and returns the corresponding instant. Only strings
 * make sense here: a Date or number already is an instant.
 */
export const dateWithTimezoneToUTC = (date: string, timezone: string): Date => {
	const offsetMinutes = parseUtcOffsetTimezone(timezone);
	if (offsetMinutes !== null) {
		// Read the wall clock as UTC, then shift by the offset. utcOffset(x, true)
		// is not equivalent: its result depends on the machine timezone.
		return dayjs.utc(date).subtract(offsetMinutes, "minute").toDate();
	}
	if (!isValidTimezone(timezone)) {
		return dayjs(date).toDate();
	}

	return dayjs.tz(date, timezone).toDate();
};
