import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import relativeTime from "dayjs/plugin/relativeTime.js";

dayjs.extend(relativeTime);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export const isBeforeDay = (
	date: string | Date,
	referenceDate?: string,
): boolean => {
	return dayjs(referenceDate).isBefore(date, "d");
};

export const isSameOrBeforeDay = (
	date: string | Date,
	referenceDate?: string,
): boolean => {
	return dayjs(referenceDate).isSameOrBefore(date, "d");
};

export const isSameOrAfterDay = (
	date: string | Date,
	referenceDate?: string,
): boolean => {
	return dayjs(referenceDate).isSameOrAfter(date, "d");
};

export const isBefore = (
	date: string | Date,
	referenceDate?: string | Date | number,
): boolean => {
	return dayjs(referenceDate).isBefore(date, "s");
};

export const isAfter = (
	date: string | Date,
	referenceDate?: string | Date,
): boolean => {
	return dayjs(referenceDate).isAfter(date, "s");
};

export const monthsBefore = (months: number): Date => {
	return dayjs().subtract(months, "month").startOf("month").toDate();
};
