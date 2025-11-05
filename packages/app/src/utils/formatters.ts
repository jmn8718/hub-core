export const formatDistance = (meters: number, addUnits = true): string => {
	const kilometers = meters / 1000;
	return `${kilometers.toFixed(2)}${addUnits ? " km" : ""}`;
};

export const formatDuration = (duration: number): string => {
	const hours = Math.floor(duration / 3600);
	const minutes = Math.floor((duration % 3600) / 60);
	const seconds = duration % 60;

	return `${hours > 0 ? `${hours}h ` : ""}${minutes}'${seconds > 0 ? ` ${seconds}"` : ""}`;
};

export const formatMeasurement = (
	value: number | null | undefined,
	fractionDigits = 1,
) => {
	if (value === null || value === undefined) {
		return "-";
	}
	return (value / 100).toFixed(fractionDigits);
};
