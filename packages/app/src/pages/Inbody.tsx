import { type IInbodyData, InbodyType } from "@repo/types";
import { useEffect, useState } from "react";
import {
	Box,
	InbodyHistoryTable,
	InbodySummary,
	LineChart,
} from "../components/index.js";
import { useDataClient } from "../contexts/index.js";

export function Inbody() {
	const { client } = useDataClient();
	const [selectedType, setSelectedType] = useState<InbodyType>(
		InbodyType.ADVANCED,
	);
	const [data, setData] = useState<IInbodyData[]>([]);

	useEffect(() => {
		const fetchInbodyData = async () => {
			const result = await client.getInbodyData({
				type: selectedType,
			});
			if (result.success) {
				setData(result.data);
			}
		};
		void fetchInbodyData();
	}, [client, selectedType]);

	// create new array copy and reverse it
	const chartData = [...data].reverse().map((item, index) => ({
		index,
		date: item.timestamp,
		weight: item.weight,
		bmi: item.bmi,
	}));

	const currentData = data[0];
	const previousData = data[1];
	const inbodyTypes = Object.values(InbodyType);

	const toTitleCase = (value: string) =>
		value.charAt(0).toUpperCase() + value.slice(1);

	const formatMeasurement = (
		value: number | null | undefined,
		fractionDigits = 1,
	) => {
		if (value === null || value === undefined) {
			return "-";
		}
		return (value / 100).toFixed(fractionDigits);
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				{inbodyTypes.map((typeOption) => {
					const isActive = typeOption === selectedType;
					return (
						<button
							key={typeOption}
							type="button"
							onClick={() => setSelectedType(typeOption)}
							className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
								isActive
									? "border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-500"
									: "border-gray-400 bg-transparent text-gray-700 hover:border-indigo-400 hover:text-indigo-500 dark:border-gray-600 dark:text-gray-200 dark:hover:text-white"
							}`}
						>
							{toTitleCase(typeOption)}
						</button>
					);
				})}
			</div>

			{currentData ? (
				<div className="grid grid-cols-1 gap-4">
					<InbodySummary current={currentData} previous={previousData} />
					<LineChart unit="kg" data={chartData} property="weight" />
					<LineChart data={chartData} property="bmi" />
					<InbodyHistoryTable
						data={data}
						formatMeasurement={formatMeasurement}
					/>
				</div>
			) : (
				<Box>
					<div className="text-lg font-medium">No data available</div>
				</Box>
			)}
		</div>
	);
}
