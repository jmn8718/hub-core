import { type IInbodyData, InbodyType } from "@repo/types";
import { cn } from "@repo/ui";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, InbodyHistoryTable, Text } from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient, useLoading, useTheme } from "../contexts/index.js";
import { formatMeasurement } from "../utils/formatters.js";

const inbodyTypes = Object.values(InbodyType);

export function InbodyHistory() {
	const { client } = useDataClient();
	const { setGlobalLoading, setLocalLoading } = useLoading();
	const { colors } = useTheme();
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [data, setData] = useState<IInbodyData[]>([]);
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

	const fetchInbodyData = async (isMainLoading: boolean) => {
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

	const handleEditEntry = (entry: IInbodyData) => {
		navigate(Routes.INBODY_EDIT.replace(":id", entry.id), {
			state: {
				record: entry,
				selectedType,
				returnTo: Routes.INBODY_HISTORY,
			},
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<Link
						to={Routes.INBODY}
						state={{ selectedType }}
						className={cn(
							"rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
							colors.buttonSecondary,
						)}
					>
						Back to charts
					</Link>
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
								returnTo: Routes.INBODY_HISTORY,
								selectedType,
							},
						})
					}
				>
					+
				</Button>
			</div>

			{data.length ? (
				<InbodyHistoryTable
					data={data}
					formatMeasurement={formatMeasurement}
					onEdit={handleEditEntry}
				/>
			) : (
				<Box>
					<Text text="No data available" className="text-lg font-medium" />
				</Box>
			)}
		</div>
	);
}
