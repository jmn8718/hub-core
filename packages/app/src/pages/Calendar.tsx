import {
	ActivitySubType,
	ActivityType,
	AppType,
	type DbActivityPopulated,
} from "@repo/types";
import { cn } from "@repo/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box, Button, Text } from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient, useLoading, useTheme } from "../contexts/index.js";
import { useWebCachedReadRefresh } from "../hooks/useWebCachedReadRefresh.js";
import { formatDistance } from "../utils/formatters.js";

const DAY_LABELS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
] as const;

const SHORT_DAY_LABEL_LENGTH = 3;
const CALENDAR_FILTER_STORAGE_KEY = "calendar.selectedTypes";

type CalendarWeek = {
	days: Date[];
	activities: DbActivityPopulated[][];
};

const ALL_TYPES = [
	ActivityType.RUN,
	ActivityType.BIKE,
	ActivityType.SWIM,
	ActivityType.HIKE,
	ActivityType.GYM,
	ActivityType.CARDIO,
	ActivityType.OTHER,
] as const;

const getMonthStart = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), 1);

const addDays = (date: Date, days: number) => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};

const addMonths = (date: Date, months: number) =>
	new Date(date.getFullYear(), date.getMonth() + months, 1);

const getMondayIndex = (date: Date) => {
	const day = date.getDay();
	return day === 0 ? 6 : day - 1;
};

const startOfCalendarGrid = (date: Date) => {
	const monthStart = getMonthStart(date);
	return addDays(monthStart, -getMondayIndex(monthStart));
};

const dateKey = (date: Date) => {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const formatDateParam = (date: Date) => dateKey(date);

const formatMonthLabel = (date: Date) =>
	new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "long",
	}).format(date);

const formatCompactDateLabel = (date: Date) =>
	new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);

const formatDurationClock = (seconds: number) => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;
	if (hours > 0) {
		return `${hours}:${`${minutes}`.padStart(2, "0")}:${`${remainingSeconds}`.padStart(2, "0")}`;
	}
	return `${minutes}:${`${remainingSeconds}`.padStart(2, "0")}`;
};

const activityAccentClass = (type: ActivityType, isDarkMode: boolean) => {
	const baseLight =
		"border-y-slate-200 border-r-slate-200 bg-slate-50 text-slate-900";
	const baseDark =
		"border-y-slate-700 border-r-slate-700 bg-slate-900 text-slate-100";
	const baseClass = isDarkMode ? baseDark : baseLight;

	switch (type) {
		case ActivityType.RUN:
			return `border-amber-500 ${baseClass}`;
		case ActivityType.BIKE:
			return `border-sky-500 ${baseClass}`;
		case ActivityType.SWIM:
			return `border-cyan-500 ${baseClass}`;
		case ActivityType.GYM:
			return `border-violet-500 ${baseClass}`;
		case ActivityType.HIKE:
			return `border-emerald-500 ${baseClass}`;
		default:
			return `border-slate-400 ${baseClass}`;
	}
};

const activityDotClass = (type: ActivityType) => {
	switch (type) {
		case ActivityType.RUN:
			return "bg-amber-500";
		case ActivityType.BIKE:
			return "bg-sky-500";
		case ActivityType.SWIM:
			return "bg-cyan-500";
		case ActivityType.GYM:
			return "bg-violet-500";
		case ActivityType.HIKE:
			return "bg-emerald-500";
		default:
			return "bg-slate-500";
	}
};

const getActivityHeader = (activity: DbActivityPopulated) => {
	if (
		activity.type === ActivityType.RUN &&
		activity.subtype === ActivitySubType.INDOOR
	) {
		return "Indoor Run";
	}

	switch (activity.type) {
		case ActivityType.RUN:
			return "Run";
		case ActivityType.BIKE:
			return "Bike";
		case ActivityType.SWIM:
			return "Swim";
		case ActivityType.HIKE:
			return "Hike";
		case ActivityType.GYM:
			return "Gym";
		case ActivityType.CARDIO:
			return "Cardio";
		default:
			return "Other";
	}
};

const getActivityMetrics = (activity: DbActivityPopulated) => ({
	distance: activity.distance > 0 ? formatDistance(activity.distance) : null,
	duration:
		activity.duration > 0 ? formatDurationClock(activity.duration) : null,
});

const getWeekTotals = (activities: DbActivityPopulated[]) => ({
	activities: activities.length,
	distance: activities.reduce((sum, activity) => sum + activity.distance, 0),
	duration: activities.reduce((sum, activity) => sum + activity.duration, 0),
	activeDays: new Set(
		activities.map((activity) => dateKey(new Date(activity.timestamp))),
	).size,
});

const CalendarTotalsSkeleton = ({ isDarkMode }: { isDarkMode: boolean }) => (
	<div className="grid gap-3 sm:grid-cols-4 sm:gap-6" aria-hidden="true">
		{["activities", "distance", "time", "days"].map((item) => (
			<div key={item} className="space-y-2">
				<div
					className={cn(
						"h-4 w-32 animate-pulse rounded-md",
						isDarkMode ? "bg-gray-700" : "bg-gray-200",
					)}
				/>
				<div
					className={cn(
						"h-5 w-20 animate-pulse rounded-md",
						isDarkMode ? "bg-gray-700" : "bg-gray-200",
					)}
				/>
			</div>
		))}
	</div>
);

const CalendarTotalItem = ({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: string;
	valueClassName: string;
}) => (
	<div>
		<Text variant="description" text={label} />
		<Text
			className={cn("pt-0.5 font-semibold sm:pt-1", valueClassName)}
			text={value}
		/>
	</div>
);

const normalizeStoredTypes = (value: string | null): ActivityType[] => {
	if (!value) return [...ALL_TYPES];

	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [...ALL_TYPES];
		const validTypes = parsed.filter((type): type is ActivityType =>
			ALL_TYPES.includes(type as ActivityType),
		);
		return validTypes.length > 0 ? validTypes : [...ALL_TYPES];
	} catch {
		return [...ALL_TYPES];
	}
};

export function Calendar() {
	const navigate = useNavigate();
	const { client, type } = useDataClient();
	const { colors, isDarkMode } = useTheme();
	const { setGlobalLoading } = useLoading();
	const isWeb = type === AppType.WEB;
	const calendarText = {
		sectionLabel: isWeb ? "text-[11px]" : "text-xs",
		body: isWeb ? "text-[11px]" : "text-xs",
		bodyStrong: isWeb ? "text-xs" : "text-sm",
		label: isWeb ? "text-xs" : "text-sm",
		title: isWeb ? "text-sm" : "text-base",
		value: isWeb ? "text-sm" : "text-lg",
	};
	const [cursorMonth, setCursorMonth] = useState(() =>
		getMonthStart(new Date()),
	);
	const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>(() => {
		if (typeof window === "undefined") return [...ALL_TYPES];
		return normalizeStoredTypes(
			window.localStorage.getItem(CALENDAR_FILTER_STORAGE_KEY),
		);
	});
	const [allActivities, setAllActivities] = useState<DbActivityPopulated[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedCompactDate, setSelectedCompactDate] = useState(() =>
		dateKey(new Date()),
	);

	const gridStart = useMemo(
		() => startOfCalendarGrid(cursorMonth),
		[cursorMonth],
	);
	const gridEnd = useMemo(() => addDays(gridStart, 41), [gridStart]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			CALENDAR_FILTER_STORAGE_KEY,
			JSON.stringify(selectedTypes),
		);
	}, [selectedTypes]);

	const fetchActivities = useCallback(
		async ({
			showLoading = true,
			showErrors = true,
		}: {
			showLoading?: boolean;
			showErrors?: boolean;
		} = {}) => {
			if (showLoading) {
				setGlobalLoading(true);
				setIsLoading(true);
			}
			const result = await client.getActivities({
				limit: 500,
				startDate: formatDateParam(gridStart),
				endDate: formatDateParam(gridEnd),
			});

			if (!result.success) {
				if (showErrors) {
					toast.error(result.error, {
						hideProgressBar: false,
						closeOnClick: false,
						transition: Bounce,
					});
				}
				setAllActivities([]);
				if (showLoading) {
					setIsLoading(false);
					setGlobalLoading(false);
				}
				return;
			}

			const sorted = [...result.data.data].sort(
				(a, b) =>
					new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
			);
			setAllActivities(sorted);
			if (showLoading) {
				setIsLoading(false);
				setGlobalLoading(false);
			}
		},
		[client, gridEnd, gridStart, setGlobalLoading],
	);

	useEffect(() => {
		void fetchActivities();
	}, [fetchActivities]);

	useWebCachedReadRefresh(["getActivities"], () =>
		fetchActivities({ showLoading: false, showErrors: false }),
	);

	const activities = useMemo(
		() =>
			allActivities.filter((activity) => selectedTypes.includes(activity.type)),
		[allActivities, selectedTypes],
	);

	const activityMap = useMemo(() => {
		const grouped = new Map<string, DbActivityPopulated[]>();
		for (const activity of activities) {
			const key = dateKey(new Date(activity.timestamp));
			const existing = grouped.get(key) ?? [];
			existing.push(activity);
			grouped.set(key, existing);
		}
		return grouped;
	}, [activities]);

	const weeks = useMemo<CalendarWeek[]>(() => {
		return Array.from({ length: 6 }, (_, weekIndex) => {
			const days = Array.from({ length: 7 }, (_, dayIndex) =>
				addDays(gridStart, weekIndex * 7 + dayIndex),
			);
			return {
				days,
				activities: days.map((day) => activityMap.get(dateKey(day)) ?? []),
			};
		});
	}, [activityMap, gridStart]);

	const monthActivities = useMemo(
		() =>
			activities.filter((activity) => {
				const activityDate = new Date(activity.timestamp);
				return (
					activityDate.getFullYear() === cursorMonth.getFullYear() &&
					activityDate.getMonth() === cursorMonth.getMonth()
				);
			}),
		[activities, cursorMonth],
	);

	const monthTotals = useMemo(
		() => getWeekTotals(monthActivities),
		[monthActivities],
	);
	const selectedCompactDay = useMemo(() => {
		for (const week of weeks) {
			const day = week.days.find(
				(item) => dateKey(item) === selectedCompactDate,
			);
			if (day) return day;
		}
		return new Date(`${selectedCompactDate}T00:00:00`);
	}, [selectedCompactDate, weeks]);
	const selectedCompactActivities = activityMap.get(selectedCompactDate) ?? [];
	const toggleType = (type: ActivityType) => {
		setSelectedTypes((current) => {
			const exists = current.includes(type);
			if (exists) {
				const next = current.filter((item) => item !== type);
				return next.length > 0 ? next : [...ALL_TYPES];
			}
			return [...current, type];
		});
	};

	return (
		<div className="space-y-4">
			<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
				<Box description="Review the month as a training calendar, with weekly totals and direct access to each workout.">
					<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex min-w-0 items-center gap-2">
								<Button
									variant="ghost"
									onClick={() =>
										setCursorMonth((current) => addMonths(current, -1))
									}
									aria-label="Previous month"
								>
									<ChevronLeft size={16} />
								</Button>
								<div className="min-w-0">
									<Text
										className={cn(calendarText.title, "font-semibold")}
										text={formatMonthLabel(cursorMonth)}
									/>
								</div>
								<Button
									variant="ghost"
									onClick={() =>
										setCursorMonth((current) => addMonths(current, 1))
									}
									aria-label="Next month"
								>
									<ChevronRight size={16} />
								</Button>
							</div>
							<Button
								variant="secondary"
								onClick={() => setCursorMonth(getMonthStart(new Date()))}
							>
								Today
							</Button>
						</div>

						<div className="flex max-w-full flex-col gap-2 xl:items-end">
							<Text
								className={cn(calendarText.body, "font-medium")}
								variant="description"
								text="Activity types"
							/>
							<div className="flex flex-wrap gap-2">
								{ALL_TYPES.map((type) => {
									const isChecked = selectedTypes.includes(type);
									return (
										<label
											key={type}
											className={cn(
												"flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 capitalize",
												calendarText.body,
												isChecked
													? colors.buttonPrimary
													: colors.buttonSecondary,
											)}
										>
											<input
												type="checkbox"
												checked={isChecked}
												onChange={() => toggleType(type)}
												className="sr-only"
											/>
											<span>{type}</span>
										</label>
									);
								})}
							</div>
						</div>
					</div>
				</Box>

				<Box>
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						{isLoading ? (
							<CalendarTotalsSkeleton isDarkMode={isDarkMode} />
						) : (
							<div className="grid gap-3 sm:grid-cols-4 sm:gap-6">
								<CalendarTotalItem
									label="Month active days"
									value={`${monthTotals.activeDays}`}
									valueClassName={calendarText.value}
								/>
								<CalendarTotalItem
									label="Month total activities"
									value={`${monthTotals.activities}`}
									valueClassName={calendarText.value}
								/>
								<CalendarTotalItem
									label="Month total distance"
									value={formatDistance(monthTotals.distance)}
									valueClassName={calendarText.value}
								/>
								<CalendarTotalItem
									label="Month total time"
									value={formatDurationClock(monthTotals.duration)}
									valueClassName={calendarText.value}
								/>
							</div>
						)}
					</div>
				</Box>
			</div>

			<Box classes="hidden overflow-hidden p-0 min-[993px]:block">
				<div className="overflow-x-auto">
					<div
						className="grid min-w-[1180px]"
						style={{
							gridTemplateColumns: "repeat(7, minmax(96px, 0.56fr)) 165px",
						}}
					>
						{DAY_LABELS.map((label) => (
							<div
								key={label}
								className={cn(
									"border-b px-4 py-3 font-semibold max-[1199px]:px-2 max-[1199px]:py-2",
									calendarText.label,
									colors.border,
									colors.panel,
								)}
							>
								<span className="max-[1199px]:hidden">{label}</span>
								<span className="hidden max-[1199px]:inline">
									{label.slice(0, SHORT_DAY_LABEL_LENGTH)}
								</span>
							</div>
						))}
						<div
							className={cn(
								"border-b px-4 py-3 font-semibold max-[1199px]:px-2 max-[1199px]:py-2",
								calendarText.label,
								colors.border,
								colors.navSurface,
							)}
						>
							<span className="max-[1199px]:hidden">Weekly totals</span>
							<span className="hidden max-[1199px]:inline">Totals</span>
						</div>

						{weeks.map((week, index) => {
							const weekActivities = week.activities.flat();
							const totals = getWeekTotals(weekActivities);

							return (
								<div
									key={`week-${index}-${dateKey(week.days[0] ?? gridStart)}`}
									className="contents"
								>
									{week.days.map((day, dayIndex) => {
										const dayActivities = week.activities[dayIndex] ?? [];
										const inCurrentMonth =
											day.getMonth() === cursorMonth.getMonth();

										return (
											<div
												key={dateKey(day)}
												className={cn(
													"min-h-[180px] border-b border-r px-3 py-3 align-top max-[1199px]:px-1.5 max-[1199px]:py-2",
													colors.border,
													!inCurrentMonth && "opacity-55",
												)}
											>
												<div className="mb-3 flex items-center justify-between gap-2 max-[1199px]:mb-1.5">
													<span
														className={cn(
															calendarText.bodyStrong,
															"font-semibold",
														)}
													>
														{day.getDate()}
													</span>
												</div>
												<div className="space-y-2 max-[1199px]:space-y-1.5">
													{dayActivities.map((activity) => {
														const metrics = getActivityMetrics(activity);
														return (
															<button
																key={activity.id}
																type="button"
																onClick={() =>
																	navigate(`${Routes.DETAILS}/${activity.id}`)
																}
																className={cn(
																	"w-full rounded-md border-l-4 px-3 py-2 text-left shadow-sm transition-colors hover:brightness-95 max-[1199px]:px-2 max-[1199px]:py-1.5",
																	calendarText.body,
																	activityAccentClass(
																		activity.type,
																		isDarkMode,
																	),
																)}
															>
																<span
																	className={cn(
																		"block truncate font-medium",
																		isDarkMode
																			? "text-slate-100"
																			: "text-slate-900",
																	)}
																>
																	{getActivityHeader(activity)}
																</span>
																<div
																	className={cn(
																		"mt-1 space-y-0.5",
																		calendarText.sectionLabel,
																		isDarkMode
																			? "text-slate-100/80"
																			: "text-slate-900/85",
																	)}
																>
																	{metrics.distance && (
																		<span className="block">
																			{metrics.distance}
																		</span>
																	)}
																	{metrics.duration && (
																		<span className="block">
																			{metrics.duration}
																		</span>
																	)}
																</div>
															</button>
														);
													})}
												</div>
											</div>
										);
									})}
									<div
										className={cn(
											"min-h-[180px] border-b px-4 py-4 max-[1199px]:px-2 max-[1199px]:py-2",
											colors.border,
											colors.navSurface,
										)}
									>
										<div className={cn("space-y-2", calendarText.body)}>
											<div>
												<Text
													className={cn(
														"uppercase tracking-wide max-[1199px]:text-[10px]",
														calendarText.sectionLabel,
													)}
													variant="description"
													text="Activities"
												/>
												<Text
													className={cn(
														"pt-0.5 font-semibold max-[1199px]:text-xs",
														calendarText.value,
													)}
													text={`${totals.activities}`}
												/>
											</div>
											<div>
												<Text
													className={cn(
														"uppercase tracking-wide max-[1199px]:text-[10px]",
														calendarText.sectionLabel,
													)}
													variant="description"
													text="Distance"
												/>
												<Text
													className={cn(
														"pt-0.5 font-semibold max-[1199px]:text-xs",
														calendarText.value,
													)}
													text={formatDistance(totals.distance)}
												/>
											</div>
											<div>
												<Text
													className={cn(
														"uppercase tracking-wide max-[1199px]:text-[10px]",
														calendarText.sectionLabel,
													)}
													variant="description"
													text="Time"
												/>
												<Text
													className={cn(
														"pt-0.5 font-semibold max-[1199px]:text-xs",
														calendarText.value,
													)}
													text={formatDurationClock(totals.duration)}
												/>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</Box>

			<Box classes="p-3 min-[993px]:hidden">
				<div className="grid grid-cols-7 gap-y-4">
					{DAY_LABELS.map((label) => (
						<div
							key={label}
							className={cn(
								"text-center text-xs font-semibold",
								isDarkMode ? "text-slate-300" : "text-slate-700",
							)}
						>
							{label.charAt(0)}
						</div>
					))}

					{weeks.flatMap((week) =>
						week.days.map((day, dayIndex) => {
							const dayActivities = week.activities[dayIndex] ?? [];
							const inCurrentMonth = day.getMonth() === cursorMonth.getMonth();
							const isSelected = dateKey(day) === selectedCompactDate;
							const hasActivities = dayActivities.length > 0;
							const visibleActivities = dayActivities.slice(0, 3);

							return (
								<button
									key={dateKey(day)}
									type="button"
									onClick={() => setSelectedCompactDate(dateKey(day))}
									aria-label={`${day.getDate()} ${formatMonthLabel(day)}`}
									aria-pressed={isSelected}
									className={cn(
										"group flex min-h-14 flex-col items-center justify-start gap-1 rounded-md px-1 py-1.5",
										!inCurrentMonth && "opacity-45",
									)}
								>
									<span
										className={cn(
											"grid place-items-center text-sm font-medium transition-shadow",
											hasActivities ? "size-9 rounded-full" : "h-9 min-w-9",
											hasActivities &&
												"group-hover:ring-2 group-hover:ring-sky-400",
											hasActivities && isSelected
												? isDarkMode
													? "bg-sky-300 text-slate-950 ring-2 ring-sky-500"
													: "bg-slate-900 text-white ring-2 ring-sky-500"
												: hasActivities
													? isDarkMode
														? "bg-slate-700 text-slate-100"
														: "bg-slate-100 text-slate-900"
													: isDarkMode
														? "text-slate-300"
														: "text-slate-700",
										)}
									>
										{day.getDate()}
									</span>
									<span className="flex h-2 items-center justify-center gap-0.5">
										{visibleActivities.map((activity) => (
											<span
												key={activity.id}
												className={cn(
													"block size-1.5 rounded-full",
													activityDotClass(activity.type),
												)}
											/>
										))}
										{dayActivities.length > visibleActivities.length && (
											<span
												className={cn(
													"text-[9px] font-semibold leading-none",
													isDarkMode ? "text-slate-300" : "text-slate-700",
												)}
											>
												+
											</span>
										)}
									</span>
								</button>
							);
						}),
					)}
				</div>

				<div className={cn("mt-5 border-t pt-4", colors.border)}>
					<div className="mb-3 flex items-baseline justify-between gap-3">
						<Text
							className="text-sm font-semibold"
							text={formatCompactDateLabel(selectedCompactDay)}
						/>
						<Text
							className="shrink-0 text-xs"
							variant="description"
							text={`${selectedCompactActivities.length} ${selectedCompactActivities.length === 1 ? "activity" : "activities"}`}
						/>
					</div>

					{selectedCompactActivities.length > 0 ? (
						<div className="space-y-2">
							{selectedCompactActivities.map((activity) => {
								const metrics = getActivityMetrics(activity);
								return (
									<button
										key={activity.id}
										type="button"
										onClick={() => navigate(`${Routes.DETAILS}/${activity.id}`)}
										className={cn(
											"w-full rounded-md border-l-4 px-3 py-2 text-left shadow-sm transition-colors hover:brightness-95",
											activityAccentClass(activity.type, isDarkMode),
										)}
									>
										<span
											className={cn(
												"block truncate text-sm font-medium",
												isDarkMode ? "text-slate-100" : "text-slate-900",
											)}
										>
											{activity.name || getActivityHeader(activity)}
										</span>
										<span
											className={cn(
												"mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs",
												isDarkMode ? "text-slate-100/75" : "text-slate-900/70",
											)}
										>
											<span>{getActivityHeader(activity)}</span>
											{metrics.distance && <span>{metrics.distance}</span>}
											{metrics.duration && <span>{metrics.duration}</span>}
										</span>
									</button>
								);
							})}
						</div>
					) : (
						<Text
							className="text-xs"
							variant="description"
							text="No activities for this day."
						/>
					)}
				</div>
			</Box>
		</div>
	);
}
