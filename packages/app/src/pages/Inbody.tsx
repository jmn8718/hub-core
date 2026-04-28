import { type IInbodyData, InbodyType } from "@repo/types";
import { cn } from "@repo/ui";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { useDataClient, useLoading, useTheme } from "../contexts/index.js";
import { useWebCachedReadRefresh } from "../hooks/useWebCachedReadRefresh.js";
import { formatMeasurement } from "../utils/formatters.js";
import { formLabelClass, inputBaseClass } from "../utils/style.js";

const inbodyTypes = Object.values(InbodyType);
const LAST_FOUR_WEEKS_DAYS = 27;
const summarySkeletonIds = ["current", "change", "trend", "baseline"] as const;
const tableSkeletonIds = ["one", "two", "three", "four", "five"] as const;

const SkeletonBlock = ({
	className,
	isDarkMode,
}: {
	className: string;
	isDarkMode: boolean;
}) => (
	<div
		className={cn(
			"animate-pulse rounded-md",
			isDarkMode ? "bg-gray-700" : "bg-gray-200",
			className,
		)}
	/>
);

const InbodyPageSkeleton = ({ isDarkMode }: { isDarkMode: boolean }) => (
	<div className="grid grid-cols-1 gap-4" aria-hidden="true">
		<Box>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{summarySkeletonIds.map((id) => (
					<div key={id} className="flex flex-col gap-3">
						<SkeletonBlock className="h-4 w-20" isDarkMode={isDarkMode} />
						<SkeletonBlock className="h-8 w-24" isDarkMode={isDarkMode} />
						<SkeletonBlock className="h-3 w-16" isDarkMode={isDarkMode} />
					</div>
				))}
			</div>
		</Box>
		<Box>
			<div className="space-y-4">
				<SkeletonBlock className="h-5 w-24" isDarkMode={isDarkMode} />
				<SkeletonBlock className="h-64 w-full" isDarkMode={isDarkMode} />
			</div>
		</Box>
		<Box>
			<div className="space-y-4">
				<SkeletonBlock className="h-5 w-20" isDarkMode={isDarkMode} />
				<SkeletonBlock className="h-64 w-full" isDarkMode={isDarkMode} />
			</div>
		</Box>
		<Box>
			<div className="space-y-3">
				<SkeletonBlock className="h-5 w-28" isDarkMode={isDarkMode} />
				{tableSkeletonIds.map((id) => (
					<SkeletonBlock
						key={id}
						className="h-14 w-full"
						isDarkMode={isDarkMode}
					/>
				))}
			</div>
		</Box>
	</div>
);

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const getDefaultDateRange = () => {
	const to = new Date();
	const from = new Date(to);
	from.setDate(to.getDate() - LAST_FOUR_WEEKS_DAYS);

	return {
		fromDate: toDateInputValue(from),
		toDate: toDateInputValue(to),
	};
};

const isWithinDateRange = (
	timestamp: string,
	fromDate: string,
	toDate: string,
) => {
	const value = new Date(timestamp).getTime();
	const from = fromDate
		? new Date(`${fromDate}T00:00:00`).getTime()
		: Number.NEGATIVE_INFINITY;
	const to = toDate
		? new Date(`${toDate}T23:59:59.999`).getTime()
		: Number.POSITIVE_INFINITY;

	return value >= from && value <= to;
};

export function Inbody() {
	const { client } = useDataClient();
	const { setGlobalLoading, setLocalLoading } = useLoading();
	const { colors, isDarkMode } = useTheme();
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
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
	const [{ fromDate, toDate }, setDateRange] = useState(getDefaultDateRange);
	const inputClass = cn(inputBaseClass, colors.input);
	const labelClass = cn(formLabelClass, colors.text, "flex flex-col gap-1");

	const fetchInbodyData = async ({
		isMainLoading,
		showLoading = true,
		showErrors = true,
	}: {
		isMainLoading: boolean;
		showLoading?: boolean;
		showErrors?: boolean;
	}) => {
		if (showLoading) {
			setIsLoading(true);
		}
		if (showLoading && isMainLoading) {
			setGlobalLoading(true);
		} else if (showLoading) {
			setLocalLoading(true);
		}
		try {
			const result = await client.getInbodyData({
				type: selectedType,
			});
			if (result.success) {
				setData(result.data);
			} else if (showErrors) {
				toast.error(result.error, {
					hideProgressBar: false,
					closeOnClick: false,
				});
			}
		} catch (err) {
			if (showErrors) {
				toast.error((err as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
				});
			}
		} finally {
			if (showLoading && isMainLoading) {
				setGlobalLoading(false);
			} else if (showLoading) {
				setLocalLoading(false);
			}
			if (showLoading) {
				setIsLoading(false);
			}
			setHasLoadedOnce(true);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		void fetchInbodyData({ isMainLoading: !hasLoadedOnce });
	}, [selectedType]);

	useWebCachedReadRefresh(["getInbodyData"], () =>
		fetchInbodyData({
			isMainLoading: false,
			showLoading: false,
			showErrors: false,
		}),
	);

	const filteredData = data.filter((item) =>
		isWithinDateRange(item.timestamp, fromDate, toDate),
	);

	// create new array copy and reverse it
	const chartData = [...filteredData].reverse().map((item, index) => ({
		index,
		date: item.timestamp,
		weight: item.weight,
		bmi: item.bmi,
	}));

	const currentData = filteredData[0];
	const previousData = filteredData[1];

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
				<div className="flex items-center gap-2">
					<Link
						to={Routes.INBODY_HISTORY}
						state={{ selectedType }}
						className={cn(
							"rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
							colors.buttonSecondary,
						)}
					>
						All records
					</Link>
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
			</div>

			<Box>
				<div className="grid gap-4 sm:grid-cols-2">
					<label className={labelClass}>
						<span>From date</span>
						<input
							type="date"
							value={fromDate}
							onChange={(event) =>
								setDateRange((current) => ({
									...current,
									fromDate: event.target.value,
								}))
							}
							className={inputClass}
						/>
					</label>
					<label className={labelClass}>
						<span>To date</span>
						<input
							type="date"
							value={toDate}
							onChange={(event) =>
								setDateRange((current) => ({
									...current,
									toDate: event.target.value,
								}))
							}
							className={inputClass}
						/>
					</label>
				</div>
			</Box>

			{isLoading ? (
				<InbodyPageSkeleton isDarkMode={isDarkMode} />
			) : currentData ? (
				<div className="grid grid-cols-1 gap-4">
					<InbodySummary current={currentData} previous={previousData} />
					<LineChart unit="kg" data={chartData} property="weight" />
					<LineChart data={chartData} property="bmi" />
					<InbodyHistoryTable
						data={filteredData}
						formatMeasurement={formatMeasurement}
						onEdit={handleEditEntry}
					/>
				</div>
			) : (
				<Box>
					<Text
						text="No data available for this date range"
						className="text-lg font-medium"
					/>
				</Box>
			)}
		</div>
	);
}
