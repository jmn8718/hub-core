import { ActivityType, type IActivityCreateInput } from "@repo/types";
import { cn } from "@repo/ui";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { Routes } from "../constants.js";
import { useDataClient, useTheme } from "../contexts/index.js";
import { toDateTimeLocal } from "./inbodyFormConfig.js";

const allowedActivityTypes: readonly ActivityType[] = [
	ActivityType.SWIM,
	ActivityType.GYM,
	ActivityType.OTHER,
] as const;

export function AddActivity() {
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [activityType, setActivityType] = useState<ActivityType>(
		ActivityType.SWIM,
	);
	const [timestamp, setTimestamp] = useState(
		toDateTimeLocal(new Date().toISOString()),
	);
	const [durationMinutes, setDurationMinutes] = useState("");
	const [distanceMeters, setDistanceMeters] = useState("");
	const [notes, setNotes] = useState("");
	const [locationName, setLocationName] = useState("");
	const [locationCountry, setLocationCountry] = useState("");
	const [laps, setLaps] = useState("");
	const [poolLength, setPoolLength] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const timezone = useMemo(
		() => Intl.DateTimeFormat().resolvedOptions().timeZone,
		[],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		if (!allowedActivityTypes.includes(activityType)) {
			setError("Only swim, gym, or other activities can be created here.");
			return;
		}

		if (!name.trim()) {
			setError("Name is required");
			return;
		}

		if (!timestamp) {
			setError("Date & time is required");
			return;
		}

		const parsedDate = new Date(timestamp);
		if (Number.isNaN(parsedDate.getTime())) {
			setError("Invalid date & time");
			return;
		}

		const parsedDuration =
			durationMinutes.trim() === ""
				? undefined
				: Math.max(0, Math.round(Number(durationMinutes) * 60));
		const parsedDistance =
			distanceMeters.trim() === ""
				? undefined
				: Math.max(0, Number(distanceMeters));

		if (parsedDuration !== undefined && Number.isNaN(parsedDuration)) {
			setError("Duration must be a valid number");
			return;
		}
		if (parsedDistance !== undefined && Number.isNaN(parsedDistance)) {
			setError("Distance must be a valid number");
			return;
		}

		const parsedLaps =
			laps.trim() === "" ? undefined : Math.max(0, Number.parseInt(laps));
		const parsedPoolLength =
			poolLength.trim() === "" ? undefined : Math.max(0, Number(poolLength));

		if (parsedLaps !== undefined && Number.isNaN(parsedLaps)) {
			setError("Laps must be a valid number");
			return;
		}
		if (parsedPoolLength !== undefined && Number.isNaN(parsedPoolLength)) {
			setError("Pool length must be a valid number");
			return;
		}

		const payload: IActivityCreateInput = {
			name: name.trim(),
			type: activityType,
			timestamp: parsedDate.toISOString(),
			timezone,
			durationSeconds: parsedDuration,
			distanceMeters:
				activityType === ActivityType.SWIM || activityType === ActivityType.GYM
					? undefined
					: parsedDistance,
			notes: notes.trim() || undefined,
			locationName: locationName.trim() || undefined,
			locationCountry: locationCountry.trim() || undefined,
			metadata:
				activityType === ActivityType.SWIM &&
				(parsedLaps !== undefined || parsedPoolLength !== undefined)
					? { laps: parsedLaps, length: parsedPoolLength }
					: undefined,
		};

		setIsSubmitting(true);
		try {
			const result = await client.createActivity(payload);
			if (!result.success) {
				throw new Error(result.error ?? "Unable to create activity");
			}
			toast.success("Activity created", { transition: Bounce });
			navigate(`${Routes.DETAILS}/${result.id}`);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="flex items-center justify-between">
				<Link
					className={cn(
						"text-sm font-medium",
						isDarkMode ? "text-white" : "text-gray-600",
					)}
					to={Routes.DATA}
				>
					← Back to Activities
				</Link>
				<div className="flex items-center gap-3">
					<Link
						className={cn(
							"rounded-full border px-4 py-2 text-sm font-medium",
							isDarkMode
								? "border-gray-600 text-gray-200"
								: "border-gray-400 text-gray-700",
						)}
						to={Routes.DATA}
					>
						Cancel
					</Link>
					<button
						type="submit"
						disabled={isSubmitting}
						className="rounded-full border border-indigo-500 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? "Saving..." : "Save Activity"}
					</button>
				</div>
			</div>
			<Box title="Add Activity" description="Limited to Swim, Gym, or Other">
				<div className="space-y-4">
					{error ? (
						<div className="rounded border border-rose-500 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
							{error}
						</div>
					) : null}
					<div className="grid gap-4 md:grid-cols-2">
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Name *</span>
							<input
								type="text"
								value={name}
								onChange={(event) => setName(event.target.value)}
								required
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Type *</span>
							<select
								value={activityType}
								onChange={(event) =>
									setActivityType(event.target.value as ActivityType)
								}
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							>
								{allowedActivityTypes.map((type) => (
									<option
										key={type}
										value={type}
										className="bg-gray-900 text-white"
									>
										{type.charAt(0).toUpperCase() + type.slice(1)}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1 text-sm font-medium">
							<span>Date &amp; Time *</span>
							<input
								type="datetime-local"
								value={timestamp}
								onChange={(event) => setTimestamp(event.target.value)}
								required
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</label>
						<div className="grid gap-4 sm:grid-cols-2 md:col-span-2 md:grid-cols-4">
							<label className="flex flex-col gap-1 text-sm font-medium">
								<span>Duration (minutes)</span>
								<input
									type="number"
									min="0"
									step="0.1"
									value={durationMinutes}
									onChange={(event) => setDurationMinutes(event.target.value)}
									className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
								/>
							</label>
							{activityType !== ActivityType.SWIM &&
								activityType !== ActivityType.GYM && (
									<label className="flex flex-col gap-1 text-sm font-medium">
										<span>Distance (meters)</span>
										<input
											type="number"
											min="0"
											step="1"
											value={distanceMeters}
											onChange={(event) =>
												setDistanceMeters(event.target.value)
											}
											className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
										/>
									</label>
								)}
							{activityType === ActivityType.SWIM && (
								<>
									<label className="flex flex-col gap-1 text-sm font-medium">
										<span>Laps</span>
										<input
											type="number"
											min="0"
											step="1"
											value={laps}
											onChange={(event) => setLaps(event.target.value)}
											className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm font-medium">
										<span>Pool Length (meters)</span>
										<input
											type="number"
											min="0"
											step="1"
											value={poolLength}
											onChange={(event) => setPoolLength(event.target.value)}
											className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
										/>
									</label>
								</>
							)}
							<label className="flex flex-col gap-1 text-sm font-medium">
								<span>Location</span>
								<input
									type="text"
									value={locationName}
									onChange={(event) => setLocationName(event.target.value)}
									className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm font-medium">
								<span>Country</span>
								<input
									type="text"
									value={locationCountry}
									onChange={(event) => setLocationCountry(event.target.value)}
									className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
								/>
							</label>
						</div>
						<label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">
							<span>Notes</span>
							<textarea
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								rows={3}
								className="rounded border border-gray-600 bg-transparent px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</label>
					</div>
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Manual activities are limited to Swim, Gym, or Other and will use
						your local timezone ({timezone}).
					</p>
				</div>
			</Box>
		</form>
	);
}
