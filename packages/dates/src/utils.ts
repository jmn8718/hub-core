import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import type { DateParam } from "./types.js";

dayjs.extend(relativeTime);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export const isBeforeDay = (
	date: DateParam,
	referenceDate: DateParam,
): boolean => {
	return dayjs(date).isBefore(referenceDate, "d");
};

export const isSameOrBeforeDay = (
	date: DateParam,
	referenceDate: DateParam,
): boolean => {
	return dayjs(date).isSameOrBefore(referenceDate, "d");
};

export const isSameOrAfterDay = (
	date: DateParam,
	referenceDate: DateParam,
): boolean => {
	return dayjs(date).isSameOrAfter(referenceDate, "d");
};

export const isBefore = (
	date: DateParam,
	referenceDate: DateParam,
): boolean => {
	return dayjs(date).isBefore(referenceDate, "s");
};

export const isAfter = (date: DateParam, referenceDate: DateParam): boolean => {
	return dayjs(date).isAfter(referenceDate, "s");
};

export const monthsBefore = (months: number): Date => {
	return dayjs().subtract(months, "month").startOf("month").toDate();
};

export const weeksBefore = (weeks: number): Date => {
	const baseDate = dayjs().subtract(weeks, "week").toDate();
	const result = new Date(baseDate.getTime());
	const day = result.getDay(); // 0 (Sun) -> 6 (Sat)
	const diff = day === 0 ? -6 : 1 - day; // shift to Monday
	result.setDate(result.getDate() + diff);
	result.setHours(0, 0, 0, 0);
	return result;
};

export const daysBefore = (days: number): Date => {
	return dayjs().subtract(days, "day").startOf("day").toDate();
};

export const startOfDay = (date: DateParam): Date => {
	return dayjs(date).startOf("day").toDate();
};
