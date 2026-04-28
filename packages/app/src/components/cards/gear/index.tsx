import { AppType, type IDbGearWithDistance } from "@repo/types";
import { cn } from "@repo/ui";
import { Gauge } from "lucide-react";
import { type FC, useState } from "react";
import { Link } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import {
	useDataClient,
	useLoading,
	useTheme,
} from "../../../contexts/index.js";
import { formatDistance } from "../../../utils/formatters.js";
import { Box } from "../../Box.js";
import { SectionContainer } from "../../SectionContainer.js";
import { DatePicker } from "../../forms/DatePicker.js";
import { EditableNumber } from "../../forms/EditableNumber.js";
import { EditableText } from "../../forms/EditableText.js";

interface GearCardProps {
	data: IDbGearWithDistance;
	isEditable?: boolean;
	titleLink?: string;
	maxDistanceEditable?: boolean;
}

function getPercentageColor(percentage: number) {
	if (percentage >= 100) return "bg-black";
	if (percentage >= 80) return "bg-red-500";
	if (percentage >= 50) return "bg-yellow-500";
	return "bg-green-500";
}

export const GearCard: FC<GearCardProps> = ({
	data,
	isEditable = true,
	titleLink,
	maxDistanceEditable,
}) => {
	const { isDarkMode } = useTheme();
	const { setLocalLoading } = useLoading();
	const { client, type } = useDataClient();
	const [gearData, setGearData] = useState<IDbGearWithDistance>(data);
	const usagePercentage = gearData.maximumDistance
		? (gearData.distance / gearData.maximumDistance) * 100
		: 0;
	const isRetired = !!gearData.dateEnd;
	const isWeb = type === AppType.WEB;
	const titleClassName = isWeb ? "text-[19px]" : "text-xl";
	const detailTextClassName = isWeb ? "text-[13px]" : "text-sm";
	const usageMetaTextClassName = isWeb ? "text-[11px]" : "text-xs";

	const refreshGear = async () => {
		const result = await client.getGear(gearData.id);
		if (result.success) {
			if (result.data) setGearData(result.data);
		} else {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
	};
	const handleEditGear = async (
		gearId: string,
		field: string,
		value: string | number,
	) => {
		setLocalLoading(true);
		const result = await client.editGear(gearId, { [field]: value });
		if (!result.success) {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
		refreshGear();
		setTimeout(() => {
			setLocalLoading(false);
		}, 250);
	};

	const handleEndDateChange = (date: string) => {
		handleEditGear(gearData.id, "dateEnd", date);
	};
	const handleNameChange = (name: string) => {
		handleEditGear(gearData.id, "name", name);
	};
	const handleCodeChange = (code: string) => {
		handleEditGear(gearData.id, "code", code);
	};
	const handleMaxDistanceChange = (distance: number) => {
		handleEditGear(gearData.id, "maximumDistance", Math.round(distance * 1000));
	};
	const maxDistanceValue =
		gearData.maximumDistance > 0 ? gearData.maximumDistance / 1000 : 0;
	const allowMaxDistanceEdit = maxDistanceEditable ?? isEditable;

	return (
		<Box classes="flex h-full flex-col">
			<div className="relative mb-4 flex items-start justify-between gap-3">
				{isEditable ? (
					<EditableText
						value={gearData.name}
						onSave={handleNameChange}
						className={cn(titleClassName, "font-semibold")}
						placeholder="Enter gear name..."
					/>
				) : titleLink ? (
					<Link
						to={titleLink}
						className={cn(
							titleClassName,
							"font-semibold hover:underline",
							isDarkMode ? "text-white" : "text-gray-900",
						)}
					>
						{gearData.name}
					</Link>
				) : (
					<span
						className={cn(
							titleClassName,
							"font-semibold",
							isDarkMode ? "text-white" : "text-gray-900",
						)}
					>
						{gearData.name}
					</span>
				)}
				{isRetired && (
					<div className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
						Retired
					</div>
				)}
			</div>

			<div className="mt-auto">
				<SectionContainer hasBorder>
					<div className="space-y-2">
						<DatePicker
							date={gearData.dateBegin}
							label="Start Date"
							isEditable={false}
							className={detailTextClassName}
							inputClassName={detailTextClassName}
						/>
						<DatePicker
							date={gearData.dateEnd}
							onSave={handleEndDateChange}
							label="End Date"
							isEditable={isEditable}
							className={detailTextClassName}
							inputClassName={detailTextClassName}
						/>
						<div
							className={cn(
								"flex items-center justify-between gap-3",
								detailTextClassName,
							)}
						>
							<span className="flex items-center gap-3">
								<Gauge
									size={16}
									className={cn(
										"size-6 shrink-0 p-1",
										isDarkMode ? "text-white" : "text-gray-500",
									)}
								/>
								Usage
							</span>
							<span>{Math.round(usagePercentage)}%</span>
						</div>
						<div className="w-full rounded-full h-2.5 bg-gray-200">
							<div
								className={`h-2.5 rounded-full ${getPercentageColor(
									usagePercentage,
								)}`}
								style={{ width: `${Math.min(usagePercentage, 100)}%` }}
							/>
						</div>
						<div
							className={cn(
								"flex items-center justify-between gap-3",
								usageMetaTextClassName,
								isDarkMode ? "text-white" : "text-gray-500",
							)}
						>
							<span className="whitespace-nowrap">
								{formatDistance(gearData.distance)}
							</span>
							{!gearData.dateEnd && allowMaxDistanceEdit ? (
								<EditableNumber
									value={maxDistanceValue}
									onSave={handleMaxDistanceChange}
									className={cn(
										"whitespace-nowrap text-right",
										usageMetaTextClassName,
									)}
									formatValue={(value) => formatDistance(value * 1000)}
								/>
							) : (
								<span
									className={cn(
										"-mx-2 whitespace-nowrap px-2 py-1 text-right",
										usageMetaTextClassName,
									)}
								>
									{formatDistance(gearData.maximumDistance)}
								</span>
							)}
						</div>
					</div>
				</SectionContainer>

				<SectionContainer>
					<div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
						<span className="text-sm font-medium">Code</span>
						{!gearData.dateEnd && isEditable ? (
							<EditableText
								value={gearData.code}
								onSave={handleCodeChange}
								className="max-w-full break-words text-sm"
								placeholder="Enter gear code..."
							/>
						) : (
							<span className="max-w-full break-words text-sm">
								{gearData.code}
							</span>
						)}
					</div>
				</SectionContainer>
			</div>
		</Box>
	);
};
