import { formatDate } from "@repo/dates";
import { type IInbodyData, InbodyType } from "@repo/types";
import { useEffect, useState } from "react";
import { Box, LineChart } from "../components/index.js";
import { useDataClient } from "../contexts/index.js";

export function Inbody() {
	const { client } = useDataClient();
	const [data, setData] = useState<IInbodyData[]>([]);

	const fetchInbodyData = async () => {
		const result = await client.getInbodyData({
			type: InbodyType.ADVANCED,
		});
		if (result.success) {
			setData(result.data);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		fetchInbodyData();
	}, []);

	// create new array copy and reverse it
	const chartData = [...data].reverse().map((item, index) => ({
		index,
		date: item.timestamp,
		weight: item.weight,
		bmi: item.bmi,
	}));

	const currentData = data[0];
	return currentData ? (
		<div className="grid grid-cols-1 gap-4">
			<Box classes="grid grid-cols-1 gap-1">
				<span>Date: {formatDate(currentData.timestamp)}</span>
				<span>Weight: {currentData.weight / 100} kg</span>
				<span>BMI: {currentData.bmi / 100} %</span>
				<span>Body Fat: {currentData.percentageBodyFat / 100} %</span>
			</Box>
			<LineChart unit="kg" data={chartData} property="weight" />
			<LineChart unit="%" data={chartData} property="bmi" />
		</div>
	) : (
		<div>No data available</div>
	);
}
