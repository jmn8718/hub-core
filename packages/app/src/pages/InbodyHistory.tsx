import { type IInbodyData, InbodyType } from "@repo/types";
import { cn } from "@repo/ui";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, InbodyHistoryTable, Text } from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient, useLoading, useTheme } from "../contexts/index.js";
import { useWebCachedReadRefresh } from "../hooks/useWebCachedReadRefresh.js";
import { formatMeasurement } from "../utils/formatters.js";

const inbodyTypes = Object.values(InbodyType);
const historySkeletonIds = ["one", "two", "three", "four", "five"] as const;

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

const InbodyHistorySkeleton = ({
	isDarkMode,
}: {
	isDarkMode: boolean;
}) => (
	<Box>
		<div className="space-y-3" aria-hidden="true">
			<SkeletonBlock className="h-5 w-28" isDarkMode={isDarkMode} />
			{historySkeletonIds.map((id) => (
				<SkeletonBlock
					key={id}
					className="h-14 w-full"
					isDarkMode={isDarkMode}
				/>
			))}
		</div>
	</Box>
);

export function InbodyHistory() {
	const { client } = useDataClient();
	const { setGlobalLoading, setLocalLoading } = useLoading();
	const { colors, isDarkMode } = useTheme();
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
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

			{isLoading ? (
				<InbodyHistorySkeleton isDarkMode={isDarkMode} />
			) : data.length ? (
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
