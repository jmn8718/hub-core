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

function withTimezone(dateParam: DateParam, timezoneValue?: string) {
	const offsetMinutes = parseUtcOffsetTimezone(timezoneValue);
	if (offsetMinutes !== null) {
		return dayjs(dateParam).utcOffset(offsetMinutes);
	}

	return timezoneValue ? dayjs.tz(dateParam, timezoneValue) : dayjs(dateParam);
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

export const dateWithTimezoneToUTC = (
	date: DateParam,
	timezone: string,
): Date => {
	const offsetMinutes = parseUtcOffsetTimezone(timezone);
	if (offsetMinutes !== null) {
		return dayjs.utc(date).utcOffset(offsetMinutes, true).toDate();
	}

	return dayjs.tz(date, timezone).toDate();
};
