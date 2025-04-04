import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export function formatDate(date: string | Date, format = "DD/MM/YYYY") {
	return dayjs(date).tz("Asia/Seoul").format(format);
}

export const isBefore = (
	date: string | Date,
	referenceDate?: string,
): boolean => {
	return dayjs(referenceDate).isBefore(date, "s");
};

export const isAfter = (
	date: string | Date,
	referenceDate?: string | Date,
): boolean => {
	return dayjs(referenceDate).isAfter(date, "s");
};
