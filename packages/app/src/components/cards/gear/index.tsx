import type { IDbGearWithDistance } from "@repo/types";
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
	const { client } = useDataClient();
	const [gearData, setGearData] = useState<IDbGearWithDistance>(data);
	const usagePercentage = gearData.maximumDistance
		? (gearData.distance / gearData.maximumDistance) * 100
		: 0;
	const isRetired = !!gearData.dateEnd;

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
		<Box>
			<div className="relative flex justify-between items-center mb-4">
				{isEditable ? (
					<EditableText
						value={gearData.name}
						onSave={handleNameChange}
						className="text-xl font-semibold"
						placeholder="Enter gear name..."
					/>
				) : titleLink ? (
					<Link
						to={titleLink}
						className={cn(
							"text-xl font-semibold hover:underline",
							isDarkMode ? "text-white" : "text-gray-900",
						)}
					>
						{gearData.name}
					</Link>
				) : (
					<span
						className={cn(
							"text-xl font-semibold",
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

			<SectionContainer hasBorder>
				<div className="space-y-2">
					<DatePicker
						date={gearData.dateBegin}
						label="Start Date"
						isEditable={false}
					/>
					<DatePicker
						date={gearData.dateEnd}
						onSave={handleEndDateChange}
						label="End Date"
						isEditable={isEditable}
					/>
					<div className="flex items-center justify-between text-sm">
						<span className="flex items-center gap-2">
							<Gauge
								size={16}
								className={isDarkMode ? "text-white" : "text-gray-500"}
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
							"flex justify-between items-center text-xs ",
							isDarkMode ? "text-white" : "text-gray-500",
						)}
					>
						<span>{formatDistance(gearData.distance)}</span>
						{!gearData.dateEnd && allowMaxDistanceEdit ? (
							<EditableNumber
								value={maxDistanceValue}
								onSave={handleMaxDistanceChange}
								className="text-right"
								formatValue={(value) => formatDistance(value * 1000)}
							/>
						) : (
							<span className="px-2 py-1 -mx-2 text-right">
								{formatDistance(gearData.maximumDistance)}
							</span>
						)}
					</div>
				</div>
			</SectionContainer>

			<SectionContainer>
				<div className="flex items-center gap-2">
					<span className="text-sm">Code:</span>
					{!gearData.dateEnd && isEditable ? (
						<EditableText
							value={gearData.code}
							onSave={handleCodeChange}
							className="text-sm"
							placeholder="Enter gear code..."
						/>
					) : (
						<span className="text-sm">{gearData.code}</span>
					)}
				</div>
			</SectionContainer>
		</Box>
	);
};
