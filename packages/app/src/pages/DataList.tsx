import { dayjs } from "@repo/dates";
import type {
	ActivitiesData,
	ActivitySubType,
	ActivityType,
	GearsData,
} from "@repo/types";
import { cn } from "@repo/ui";
import { RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { ActivityCard, ActivityFilters } from "../components/index.js";
import { useDataClient, useLoading, useTheme } from "../contexts/index.js";

export function DataList() {
	const { isDarkMode } = useTheme();
	const { client } = useDataClient();
	const { setGlobalLoading, isGlobalLoading, isLocalLoading, setLocalLoading } =
		useLoading();
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<ActivityType | "ALL">("ALL");
	const [subtypeFilter, setSubtypeFilter] = useState<ActivitySubType | "">("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [isRaceFilter, setIsRaceFilter] = useState<boolean | "ALL">("ALL");
	const [appliedFilters, setAppliedFilters] = useState<{
		type: ActivityType | "ALL";
		subtype: ActivitySubType | "";
		startDate: string;
		endDate: string;
		search: string;
		isEvent: boolean | "ALL";
	}>({
		type: "ALL",
		subtype: "",
		startDate: "",
		endDate: "",
		search: "",
		isEvent: "ALL",
	});

	const [data, setData] = useState<ActivitiesData>({
		count: 0,
		data: [],
		cursor: "",
	});
	const [gears, setGears] = useState<GearsData>({
		count: 0,
		data: [],
		cursor: "",
	});

	const fetchGears = useCallback(
		async ({
			cursor,
			limit,
		}: {
			cursor?: string;
			limit: number;
		}) => {
			const result = await client.getGears({ cursor, limit });
			if (result.success) {
				setGears(result.data);
			} else {
				toast.error(result.error, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			}
		},
		[client],
	);

	const fetchData = useCallback(
		async ({
			cursor,
			limit,
			reset = false,
		}: {
			cursor?: string;
			limit: number;
			reset?: boolean;
		}) => {
			const result = await client.getActivities({
				limit,
				cursor,
				type: appliedFilters.type === "ALL" ? undefined : appliedFilters.type,
				subtype: appliedFilters.subtype || undefined,
				startDate: appliedFilters.startDate || undefined,
				endDate: appliedFilters.endDate || undefined,
				search: appliedFilters.search || undefined,
				isEvent:
					appliedFilters.isEvent === "ALL"
						? undefined
						: appliedFilters.isEvent
							? 1
							: 0,
			});
			if (result.success) {
				setData((current) => ({
					count: result.data.count,
					data: reset
						? result.data.data
						: current.data.concat(result.data.data),
					cursor: result.data.cursor,
				}));
			} else {
				toast.error(result.error, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			}
			setTimeout(() => {
				if (!cursor || reset) setGlobalLoading(false);
				else setLocalLoading(false);
			}, 250);
		},
		[appliedFilters, client, setGlobalLoading, setLocalLoading],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		setGlobalLoading(true);
		setData({
			count: 0,
			data: [],
			cursor: "",
		});
		fetchData({
			limit: 20,
			reset: true,
		});
	}, [fetchData]);

	useEffect(() => {
		fetchGears({
			limit: 50,
		});
	}, [fetchGears]);

	const loadMoreClick = () => {
		setLocalLoading(true);
		fetchData({
			limit: 20,
			cursor: data.cursor,
		});
	};

	const filteredActivities = useMemo(() => {
		return [...data.data].sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);
	}, [data]);

	const applyFilters = () => {
		if (startDate && endDate && dayjs(startDate).isAfter(dayjs(endDate))) {
			toast.error("Start date must be before end date", {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
			return;
		}
		setAppliedFilters({
			type: typeFilter,
			subtype: subtypeFilter,
			startDate,
			endDate,
			isEvent: isRaceFilter,
			search,
		});
	};
	return (
		<>
			<ActivityFilters
				search={search}
				setSearch={setSearch}
				type={typeFilter}
				setType={setTypeFilter}
				subtype={subtypeFilter}
				setSubtype={setSubtypeFilter}
				startDate={startDate}
				endDate={endDate}
				setStartDate={setStartDate}
				setEndDate={setEndDate}
				onApplyFilters={applyFilters}
				isRace={isRaceFilter}
				setIsRace={setIsRaceFilter}
			/>

			{filteredActivities.length === 0 ? (
				!isGlobalLoading && (
					<div className="text-center py-12">
						<p className="text-gray-500 dark:text-gray-400">
							No activities found matching your criteria.
						</p>
					</div>
				)
			) : (
				<div className="grid grid-cols-1 gap-4 mt-4">
					{filteredActivities.map((activity) => (
						<ActivityCard
							key={activity.id}
							activity={activity}
							gears={gears.data}
							showDetailsButton
						/>
					))}
				</div>
			)}
			{data.data.length !== data.count && (
				<div className="flex justify-center py-2">
					<button
						type="button"
						onClick={loadMoreClick}
						className={cn(
							"shadow-lg rounded-full p-2",
							isDarkMode ? "bg-gray-700" : "bg-white",
							isLocalLoading ? "animate-spin" : "",
						)}
					>
						<RefreshCcw
							size={40}
							className={isDarkMode ? "text-white" : "text-gray-500"}
						/>
					</button>
				</div>
			)}
		</>
	);
}
