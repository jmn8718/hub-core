import type { ActivitiesData, IDbGear } from "@repo/types";
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
	const [gears, setGears] = useState<IDbGear[]>([]);

	const fetchGears = useCallback(
		async (skip = 0, size = 10) => {
			// TODO add new query for only gear without accumulate
			const result = await client.getGears({ skip, size });
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
		async (skip = 0, size = 50) => {
			const result = await client.getActivities({ size, skip });
			if (result.success) {
				setData((current) => ({
					count: result.data.count,
					data:
						skip === 0
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
				if (skip === 0) setGlobalLoading(false);
				else setLocalLoading(false);
			}, 250);
		},
		[client, setGlobalLoading, setLocalLoading],
	);

	// useEffect(() => {
	//   if (data.count > data.data.length) {
	//     fetchData(data.data.length, 100);
	//   }
	// }, [data, fetchData]);

	useEffect(() => {
		setGlobalLoading(true);
		fetchData();
		fetchGears();
	}, [fetchData, fetchGears, setGlobalLoading]);

	const loadMoreClick = () => {
		setLocalLoading(true);
		fetchData(data.data.length, 20);
	};

	const filteredActivities = useMemo(() => {
		return data.data
			.filter(
				(activity) =>
					search === "" ||
					activity.id.toLowerCase().includes(search) ||
					activity.name.toLowerCase().includes(search.toLowerCase()) ||
					(activity.location_name || "")
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
				<div className="grid grid-cols-1 gap-6">
					{filteredActivities.map((activity) => (
						<ActivityCard key={activity.id} activity={activity} gears={gears} />
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
