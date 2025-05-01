import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { DateParam } from "./types.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatDate(
	dateParam: DateParam,
	options?: {
		format?: string;
		timezone?: string;
	},
): string {
	const format = options?.format || "YYYY/MM/DD";
	const date = options?.timezone
		? dayjs(dateParam).tz(options.timezone)
		: dayjs(dateParam);
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
