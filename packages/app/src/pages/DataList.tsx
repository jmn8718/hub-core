import type { ActivitiesData, GearsData } from "@repo/types";
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
		}: {
			cursor?: string;
			limit: number;
		}) => {
			const result = await client.getActivities({ limit, cursor });
			if (result.success) {
				setData((current) => ({
					count: result.data.count,
					data: current.data.concat(result.data.data),
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
				if (!cursor) setGlobalLoading(false);
				else setLocalLoading(false);
			}, 250);
		},
		[client, setGlobalLoading, setLocalLoading],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		setGlobalLoading(true);
		fetchData({
			limit: 20,
		});
		fetchGears({
			limit: 50,
		});
	}, []);

	const loadMoreClick = () => {
		setLocalLoading(true);
		fetchData({
			limit: 20,
			cursor: data.cursor,
		});
	};

	const filteredActivities = useMemo(() => {
		return data.data
			.filter(
				(activity) =>
					search === "" ||
					activity.id.toLowerCase().includes(search) ||
					activity.name.toLowerCase().includes(search.toLowerCase()) ||
					(activity.locationName || "")
						.toLowerCase()
						.includes(search.toLowerCase()),
			)
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			);
	}, [search, data]);
	return (
		<>
			<ActivityFilters search={search} setSearch={setSearch} />

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
