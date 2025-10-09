export function formatePace(speed = 0) {
	const pace = speed > 0 ? 1000 / 60 / speed : 0;
	const min = Math.floor(pace);
	const sec = Math.round((pace - min) * 60);
	return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

export function formatTime(seconds = 0) {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins} min ${secs} sec`;
}
