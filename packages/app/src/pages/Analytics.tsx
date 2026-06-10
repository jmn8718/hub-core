import { dayjs } from "@repo/dates";
import type { IWeeklyOverviewData } from "@repo/types";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { Text } from "../components/Text.js";
import {
	DailyActivitySummary,
	MonthlyActivityChart,
	WeeklyDistanceChart,
	WeeklyOverviewList,
} from "../components/index.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { useLoading } from "../contexts/index.js";
import { useWebCachedReadRefresh } from "../hooks/useWebCachedReadRefresh.js";

type AnalyticsTab = "general" | "insight";
type WeekRange = 8 | 12 | 16;

const INSIGHT_RANGE_OPTIONS: WeekRange[] = [8, 12, 16];

const formatDateForInput = (value: string | Date) =>
	dayjs(value).format("YYYY-MM-DD");

const normalizeWeekStart = (value: string | Date) => {
	const base = dayjs(value).startOf("day");
	const weekday = base.day();
	const diff = weekday === 0 ? -6 : 1 - weekday;
	return base.add(diff, "day");
};

const formatTargetWeekLabel = (weekStart: string) => {
	const start = normalizeWeekStart(weekStart);
	const end = start.add(6, "day");
	return `${start.format("MMM D")} - ${end.format("MMM D")}`;
};

export const Home = () => {
	const { client } = useDataClient();
	const { setGlobalLoading } = useLoading();
	const { isDarkMode } = useTheme();
	const activeLoadersRef = useRef(new Set<string>());
	const [activeTab, setActiveTab] = useState<AnalyticsTab>("general");
	const [weekRange, setWeekRange] = useState<WeekRange>(8);
	const [targetWeekStart, setTargetWeekStart] = useState<string>(
		formatDateForInput(normalizeWeekStart(new Date()).toDate()),
	);
	const [weeklyInsightData, setWeeklyInsightData] = useState<
		IWeeklyOverviewData[]
	>([]);
	const [isWeeklyInsightLoading, setIsWeeklyInsightLoading] = useState(false);

	const handleLoadingChange = useCallback(
		(key: string, isLoading: boolean) => {
			if (isLoading) {
				activeLoadersRef.current.add(key);
				setGlobalLoading(true);
				return;
			}

			activeLoadersRef.current.delete(key);
			if (activeLoadersRef.current.size === 0) {
				setGlobalLoading(false);
			}
		},
		[setGlobalLoading],
	);
	const handleDailyLoading = useCallback(
		(isLoading: boolean) => handleLoadingChange("daily", isLoading),
		[handleLoadingChange],
	);
	const handleMonthlyLoading = useCallback(
		(isLoading: boolean) => handleLoadingChange("monthly", isLoading),
		[handleLoadingChange],
	);

	const fetchWeeklyInsight = useCallback(
		async ({
			showLoading = true,
			showErrors = true,
		}: {
			showLoading?: boolean;
			showErrors?: boolean;
		} = {}) => {
			if (showLoading) {
				setIsWeeklyInsightLoading(true);
				handleLoadingChange("weekly-insight", true);
			}

			try {
				const result = await client.getWeeklyOverview({
					limit: weekRange,
					targetWeekStart,
				});
				if (result.success) {
					setWeeklyInsightData(result.data);
				} else if (showErrors) {
					toast.error(result.error, {
						hideProgressBar: false,
						closeOnClick: false,
						transition: Bounce,
					});
				}
			} catch (err) {
				if (!showErrors) {
					return;
				}
				toast.error((err as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			} finally {
				if (showLoading) {
					setIsWeeklyInsightLoading(false);
					handleLoadingChange("weekly-insight", false);
				}
			}
		},
		[client, handleLoadingChange, targetWeekStart, weekRange],
	);

	useEffect(() => {
		return () => {
			activeLoadersRef.current.clear();
			setGlobalLoading(false);
		};
	}, [setGlobalLoading]);

	useEffect(() => {
		if (activeTab !== "insight") {
			return;
		}
		void fetchWeeklyInsight();
	}, [activeTab, fetchWeeklyInsight]);

	useWebCachedReadRefresh(["getWeeklyOverview"], () => {
		if (activeTab !== "insight") {
			return;
		}
		return fetchWeeklyInsight({ showLoading: false, showErrors: false });
	});

	const selectorClass = useCallback(
		(active: boolean) =>
			cn(
				"inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase transition-colors",
				active
					? isDarkMode
						? "border-blue-500/50 bg-blue-500/10 text-blue-200 shadow-sm"
						: "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
					: isDarkMode
						? "border-gray-700 bg-gray-900 text-gray-300 hover:border-blue-400/50"
						: "border-gray-200 bg-white text-gray-600 hover:border-blue-200",
			),
		[isDarkMode],
	);

	const targetWeekSummary = useMemo(
		() => formatTargetWeekLabel(targetWeekStart),
		[targetWeekStart],
	);

	return (
		<div className="space-y-4">
			<Box classes="min-h-fit">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div
						className={cn(
							"inline-flex w-fit rounded-full border p-1",
							isDarkMode
								? "border-gray-700 bg-gray-900"
								: "border-gray-200 bg-gray-50",
						)}
					>
						{(["general", "insight"] as const).map((tab) => {
							const active = activeTab === tab;
							return (
								<button
									key={tab}
									type="button"
									role="tab"
									aria-selected={active}
									onClick={() => setActiveTab(tab)}
									className={cn(
										"rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors",
										active
											? isDarkMode
												? "bg-blue-500/15 text-blue-100"
												: "bg-white text-gray-900 shadow-sm"
											: isDarkMode
												? "text-gray-400"
												: "text-gray-600",
									)}
								>
									{tab}
								</button>
							);
						})}
					</div>
					{activeTab === "insight" ? (
						<Text
							className={isDarkMode ? "text-gray-400" : "text-gray-500"}
							text={`Inspecting ${targetWeekSummary}`}
						/>
					) : null}
				</div>
			</Box>

			{activeTab === "general" ? (
				<>
					<DailyActivitySummary onLoadingChange={handleDailyLoading} />
					<MonthlyActivityChart onLoadingChange={handleMonthlyLoading} />
				</>
			) : (
				<>
					<Box classes="min-h-fit">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
							<div className="space-y-1">
								<Text
									className={cn(
										"text-xs font-semibold uppercase tracking-[0.18em]",
										isDarkMode ? "text-gray-400" : "text-gray-500",
									)}
									text="Insight controls"
								/>
								<p className="text-2xl font-semibold">
									Weekly period anchored to {targetWeekSummary}
								</p>
							</div>
							<div className="flex flex-col gap-3 lg:items-end">
								<div
									className="flex flex-wrap gap-2"
									role="radiogroup"
									aria-label="Weekly insight range"
								>
									{INSIGHT_RANGE_OPTIONS.map((option) => (
										<label
											key={option}
											className={selectorClass(option === weekRange)}
										>
											<input
												type="radio"
												name="weekly-insight-range"
												value={option}
												checked={option === weekRange}
												onChange={() => setWeekRange(option)}
												className="sr-only"
											/>
											<span>{option} weeks</span>
										</label>
									))}
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<label
										htmlFor="weekly-target-week"
										className={cn(
											"text-xs font-semibold uppercase tracking-[0.18em]",
											isDarkMode ? "text-gray-400" : "text-gray-500",
										)}
									>
										Target week
									</label>
									<input
										id="weekly-target-week"
										type="date"
										value={targetWeekStart}
										onChange={(event) =>
											setTargetWeekStart(
												formatDateForInput(
													normalizeWeekStart(event.target.value).toDate(),
												),
											)
										}
										className={cn(
											"rounded-md border px-3 py-1 text-sm",
											isDarkMode
												? "border-gray-700 bg-gray-900 text-white"
												: "border-gray-200 bg-white text-gray-800",
										)}
									/>
								</div>
							</div>
						</div>
					</Box>
					<WeeklyOverviewList
						weeks={weeklyInsightData}
						isLoading={isWeeklyInsightLoading}
					/>
					<WeeklyDistanceChart
						weekRange={weekRange}
						weeks={weeklyInsightData}
						isLoading={isWeeklyInsightLoading}
						targetWeekStart={targetWeekStart}
					/>
				</>
			)}
		</div>
	);
};
