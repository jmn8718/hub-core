import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatDate(
	dateParam: string | Date,
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
	date: string | Date,
	timezone?: string,
): string => {
	return formatDate(date, {
		format: "YYYY-MM-DD HH:mm",
		timezone,
	});
};
