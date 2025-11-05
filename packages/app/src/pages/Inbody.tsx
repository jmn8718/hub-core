import { type IInbodyData, InbodyType } from "@repo/types";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	Box,
	Button,
	InbodyHistoryTable,
	InbodySummary,
	LineChart,
} from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient } from "../contexts/index.js";

export function Inbody() {
	const { client } = useDataClient();
	const navigate = useNavigate();
	const location = useLocation();
	const locationState = location.state as {
		selectedType?: InbodyType;
	} | null;

	const candidate = locationState?.selectedType;
	const locationSelectedType = Object.values(InbodyType).includes(
		candidate as InbodyType,
	)
		? (candidate as InbodyType)
		: null;

	const [selectedType, setSelectedType] = useState<InbodyType>(
		locationSelectedType ?? InbodyType.BASIC,
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

	const handleEditEntry = (entry: IInbodyData) => {
		navigate(Routes.INBODY_EDIT.replace(":id", entry.id), {
			state: {
				record: entry,
				selectedType,
				returnTo: Routes.INBODY,
			},
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					{inbodyTypes.map((typeOption) => {
						const isActive = typeOption === selectedType;
						return (
							<Button
								key={typeOption}
								isActive={isActive}
								onClick={() => setSelectedType(typeOption)}
							>
								{toTitleCase(typeOption)}
							</Button>
						);
					})}
				</div>
				<Button
					onClick={() =>
						navigate(Routes.INBODY_ADD, {
							state: {
								returnTo: Routes.INBODY,
								selectedType,
							},
						})
					}
				>
					+
				</Button>
			</div>

			{currentData ? (
				<div className="grid grid-cols-1 gap-4">
					<InbodySummary current={currentData} previous={previousData} />
					<LineChart unit="kg" data={chartData} property="weight" />
					<LineChart data={chartData} property="bmi" />
					<InbodyHistoryTable
						data={data}
						formatMeasurement={formatMeasurement}
						onEdit={handleEditEntry}
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
