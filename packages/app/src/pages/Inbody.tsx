import { type IInbodyData, InbodyType } from "@repo/types";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
	Box,
	Button,
	InbodyHistoryTable,
	InbodySummary,
	LineChart,
	Text,
} from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient, useLoading } from "../contexts/index.js";
import { formatMeasurement } from "../utils/formatters.js";

const inbodyTypes = Object.values(InbodyType);

export function Inbody() {
	const { client } = useDataClient();
	const { setGlobalLoading, setLocalLoading } = useLoading();
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
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

	const fetchInbodyData = async (isMainLoading: boolean) => {
		console.log("Fetching inbody data...", isMainLoading);
		if (isMainLoading) {
			setGlobalLoading(true);
		} else {
			setLocalLoading(true);
		}
		try {
			const result = await client.getInbodyData({
				type: selectedType,
			});
			if (result.success) {
				setData(result.data);
			}
		} catch (err) {
			// Handle error if needed
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
			});
		} finally {
			if (isMainLoading) {
				setGlobalLoading(false);
			} else {
				setLocalLoading(false);
			}
			setHasLoadedOnce(true);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		fetchInbodyData(!hasLoadedOnce);
	}, [selectedType]);
	// create new array copy and reverse it
	const chartData = [...data].reverse().map((item, index) => ({
		index,
		date: item.timestamp,
		weight: item.weight,
		bmi: item.bmi,
	}));

	const currentData = data[0];
	const previousData = data[1];

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
								className="capitalize"
								onClick={() => setSelectedType(typeOption)}
							>
								{typeOption}
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
					<Text text="No data available" className="text-lg font-medium" />
				</Box>
			)}
		</div>
	);
}
