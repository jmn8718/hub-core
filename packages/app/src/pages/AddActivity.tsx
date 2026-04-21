import { ActivityType, type IActivityCreateInput } from "@repo/types";
import { cn } from "@repo/ui";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { Routes } from "../constants.js";
import { useDataClient, useTheme } from "../contexts/index.js";
import {
	formLabelClass,
	inputBaseClass,
	pillButtonBaseClass,
} from "../utils/style.js";
import { toDateTimeLocal } from "./inbodyFormConfig.js";

const allowedActivityTypes: readonly ActivityType[] = [
	ActivityType.GYM,
	ActivityType.SWIM,
	ActivityType.OTHER,
] as const;

const formatActivityName = (type: ActivityType) =>
	type.charAt(0).toUpperCase() + type.slice(1);

export function AddActivity() {
	const { client } = useDataClient();
	const { colors } = useTheme();
	const navigate = useNavigate();
	const [activityType, setActivityType] = useState<ActivityType>(
		ActivityType.GYM,
	);
	const [name, setName] = useState(() => formatActivityName(ActivityType.GYM));
	const [isNameDirty, setIsNameDirty] = useState(false);
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
	const inputClass = cn(
		inputBaseClass,
		"min-w-0 max-w-full w-full text-base",
		colors.input,
	);
	const labelClass = cn(
		formLabelClass,
		colors.text,
		"flex min-w-0 flex-col gap-1",
	);

	useEffect(() => {
		if (!isNameDirty) {
			setName(formatActivityName(activityType));
		}
	}, [activityType, isNameDirty]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		if (!allowedActivityTypes.includes(activityType)) {
			setError("You can only create gym, swim, or other activities here.");
			return;
		}

		if (!name.trim()) {
			setError("Enter an activity name.");
			return;
		}

		if (!timestamp) {
			setError("Choose a date and time.");
			return;
		}

		const parsedDate = new Date(timestamp);
		if (Number.isNaN(parsedDate.getTime())) {
			setError("Enter a valid date and time.");
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
			setError("Enter a valid duration in minutes.");
			return;
		}
		if (parsedDistance !== undefined && Number.isNaN(parsedDistance)) {
			setError("Enter a valid distance in meters.");
			return;
		}

		const parsedLaps =
			laps.trim() === "" ? undefined : Math.max(0, Number.parseInt(laps));
		const parsedPoolLength =
			poolLength.trim() === "" ? undefined : Math.max(0, Number(poolLength));

		if (parsedLaps !== undefined && Number.isNaN(parsedLaps)) {
			setError("Enter a valid lap count.");
			return;
		}
		if (parsedPoolLength !== undefined && Number.isNaN(parsedPoolLength)) {
			setError("Enter a valid pool length.");
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
				throw new Error(result.error ?? "Could not create the activity.");
			}
			toast.success("Activity saved.", { transition: Bounce });
			navigate(`${Routes.DETAILS}/${result.id}`);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Link
					className={cn("text-sm font-medium", colors.text)}
					to={Routes.DATA}
				>
					← Back to Activities
				</Link>
				<div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
					<Link
						className={cn(
							pillButtonBaseClass,
							"text-center whitespace-nowrap",
							colors.buttonSecondary,
						)}
						to={Routes.DATA}
					>
						Cancel
					</Link>
					<button
						type="submit"
						disabled={isSubmitting}
						className={cn(
							pillButtonBaseClass,
							"font-semibold whitespace-nowrap",
							colors.buttonPrimary,
						)}
					>
						{isSubmitting ? "Saving..." : "Save Activity"}
					</button>
				</div>
			</div>
			<Box
				title="Add Activity"
				description="Create a manual gym, swim, or other activity."
			>
				<div className="space-y-4">
					{error ? (
						<div className="rounded border border-rose-500 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
							{error}
						</div>
					) : null}
					<div className="grid min-w-0 gap-4 md:grid-cols-2">
						<label className={labelClass}>
							<span>Name *</span>
							<input
								type="text"
								value={name}
								onChange={(event) => {
									setIsNameDirty(true);
									setName(event.target.value);
								}}
								required
								className={inputClass}
							/>
						</label>
						<label className={labelClass}>
							<span>Type *</span>
							<select
								value={activityType}
								onChange={(event) =>
									setActivityType(event.target.value as ActivityType)
								}
								className={inputClass}
							>
								{allowedActivityTypes.map((type) => (
									<option key={type} value={type}>
										{type.charAt(0).toUpperCase() + type.slice(1)}
									</option>
								))}
							</select>
						</label>
						<label className={labelClass}>
							<span>Date &amp; Time *</span>
							<input
								type="datetime-local"
								value={timestamp}
								onChange={(event) => setTimestamp(event.target.value)}
								required
								className={inputClass}
							/>
						</label>
						<div className="grid min-w-0 gap-4 sm:grid-cols-2 md:col-span-2 md:grid-cols-4">
							<label className={labelClass}>
								<span>Duration (minutes)</span>
								<input
									type="number"
									min="0"
									step="0.1"
									value={durationMinutes}
									onChange={(event) => setDurationMinutes(event.target.value)}
									className={inputClass}
								/>
							</label>
							{activityType !== ActivityType.SWIM &&
								activityType !== ActivityType.GYM && (
									<label className={labelClass}>
										<span>Distance (meters)</span>
										<input
											type="number"
											min="0"
											step="1"
											value={distanceMeters}
											onChange={(event) =>
												setDistanceMeters(event.target.value)
											}
											className={inputClass}
										/>
									</label>
								)}
							{activityType === ActivityType.SWIM && (
								<>
									<label className={labelClass}>
										<span>Laps</span>
										<input
											type="number"
											min="0"
											step="1"
											value={laps}
											onChange={(event) => setLaps(event.target.value)}
											className={inputClass}
										/>
									</label>
									<label className={labelClass}>
										<span>Pool Length (meters)</span>
										<input
											type="number"
											min="0"
											step="1"
											value={poolLength}
											onChange={(event) => setPoolLength(event.target.value)}
											className={inputClass}
										/>
									</label>
								</>
							)}
							<label className={labelClass}>
								<span>Location</span>
								<input
									type="text"
									value={locationName}
									onChange={(event) => setLocationName(event.target.value)}
									className={inputClass}
								/>
							</label>
							<label className={labelClass}>
								<span>Country</span>
								<input
									type="text"
									value={locationCountry}
									onChange={(event) => setLocationCountry(event.target.value)}
									className={inputClass}
								/>
							</label>
						</div>
						<label className={cn(labelClass, "md:col-span-2")}>
							<span>Notes</span>
							<textarea
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								rows={3}
								className={inputClass}
							/>
						</label>
					</div>
					<p className={cn("text-xs", colors.description)}>
						Manual activities are limited to Swim, Gym, or Other and will use
						your local timezone ({timezone}).
					</p>
				</div>
			</Box>
		</form>
	);
}
