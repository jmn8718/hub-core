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

export const formatDate = (
	date: string | Date,
	format = "YYYY-MM-DD",
): string => {
	return dayjs(date).format(format);
};

export const formatDateWithTime = (date: string | Date): string => {
	return formatDate(date, "YYYY-MM-DD HH:mm");
};

export const isValidDate = (date: string | Date): boolean => {
	return dayjs(date).isValid();
};

export const formatRelativeTime = (date: string | Date): string => {
	return dayjs(date).fromNow();
};
