import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatDate(date: string | Date, format = "DD/MM/YYYY") {
	return dayjs(date).tz("Asia/Seoul").format(format);
}
