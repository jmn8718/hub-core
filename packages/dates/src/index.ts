import day from "dayjs";

export * from "./format.js";
export * from "./utils.js";

export const dayjs = day;

export const isValidDate = (date: string | Date): boolean => {
	return day(date).isValid();
};
