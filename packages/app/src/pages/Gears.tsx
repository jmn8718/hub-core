import {
	GearType,
	type GearsData,
	type IDbGearWithDistance,
} from "@repo/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { GearCard, GearFilters, H2 } from "../components/index.js";
import { useDataClient, useLoading } from "../contexts/index.js";

export function Gears() {
	const { client } = useDataClient();
	const { setGlobalLoading, isGlobalLoading } = useLoading();
	const [search, setSearch] = useState("");
	const [showRetired, setShowRetired] = useState(false);

	const [gears, setGears] = useState<GearsData>({
		count: 0,
		data: [],
		cursor: "",
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const fetchData = useCallback(
		async ({
			cursor,
			limit,
		}: {
			cursor?: string;
			limit: number;
		}) => {
			setGlobalLoading(true);
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
			setTimeout(() => {
				setGlobalLoading(false);
			}, 500);
		},
		[setGears, setGlobalLoading],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		fetchData({
			limit: 50,
			cursor: gears.cursor,
		});
	}, []);

	const filteredGear = useMemo(() => {
		const filteredGears = gears.data
			.filter(
				(gear) =>
					(search === "" ||
						gear.name.toLowerCase().includes(search.toLowerCase()) ||
						gear.code.toLowerCase().includes(search.toLowerCase())) &&
					(showRetired || !gear.dateEnd),
			)
			.sort((a, b) => {
				// Sort by active first, then by start date
				const aActive = !a.dateEnd;
				const bActive = !b.dateEnd;
				if (aActive !== bActive) return bActive ? 1 : -1;
				return (
					new Date(b.dateBegin || 0).getTime() -
					new Date(a.dateBegin || 0).getTime()
				);
			});
		return filteredGears.reduce(
			(acc, currentGear) => {
				acc[currentGear.type].push(currentGear);
				return acc;
			},
			{
				[GearType.SHOES]: [],
				[GearType.INSOLE]: [],
				[GearType.BIKE]: [],
				[GearType.OTHER]: [],
			} as Record<GearType, IDbGearWithDistance[]>,
		);
	}, [search, showRetired, gears]);

	return (
		<>
			<GearFilters
				search={search}
				setSearch={setSearch}
				showRetired={showRetired}
				setShowRetired={setShowRetired}
			/>
			{Object.entries(filteredGear).map(
				([key, values]) =>
					values.length > 0 && (
						<div className="mt-4" key={key}>
							<H2 text={key} classes="uppercase mb-4" />
							{values.length === 0 ? (
								!isGlobalLoading && (
									<div className="text-center py-12">
										<p className="text-gray-500 dark:text-gray-400">
											No gear found matching your criteria.
										</p>
									</div>
								)
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{values.map((gear) => (
										<GearCard key={gear.id} data={gear} />
									))}
								</div>
							)}
						</div>
					),
			)}
		</>
	);
}
