import dayjs from "dayjs";

export function formatDate(date: string | Date, format = "DD/MM/YYYY") {
  return dayjs(date).format(format);
}
