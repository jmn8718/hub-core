import type { IDbGear } from "@repo/types";
import { cn } from "@repo/ui";
import { Gauge } from "lucide-react";
import type { FC } from "react";
import { useLoading, useTheme } from "../../../contexts/index.js";
import { formatDistance } from "../../../utils/formatters.js";
import { Box } from "../../Box.js";
import { SectionContainer } from "../../SectionContainer.js";
import { DatePicker } from "../../forms/DatePicker.js";
import { EditableNumber } from "../../forms/EditableNumber.js";
import { EditableText } from "../../forms/EditableText.js";

interface GearCardProps {
	// add totals
	data: IDbGear;
}

export const GearCard: FC<GearCardProps> = ({ data }) => {
	const { isDarkMode } = useTheme();
	const { setLocalLoading } = useLoading();
	// const usagePercentage = data.maximumDistance
	//   ? (data.total / data.maximumDistance) * 100
	//   : 0;
	const usagePercentage = 0;
	const isRetired = !!data.dateEnd;

	const handleEditGear = async (
		gearId: string,
		field: string,
		value: string | number,
	) => {
		setLocalLoading(true);
		// const result = await window.electron.ipcRenderer.invoke(
		//   Channels.DB_GEAR_EDIT,
		//   {
		//     gearId,
		//     field,
		//     value,
		//   },
		// );
		// if (!result.success) {
		//   // handle error
		//   // eslint-disable-next-line no-console
		//   /* eslint-disable */console.error(...oo_tx(`2789513214_44_6_44_36_11`,'error', result));
		// }
		// // refreshGear();
		setTimeout(() => {
			setLocalLoading(false);
		}, 250);
	};

	const handleEndDateChange = (date: string) => {
		handleEditGear(data.id, "date_end", date);
	};
	const handleNameChange = (name: string) => {
		handleEditGear(data.id, "name", name);
	};
	const handleCodeChange = (code: string) => {
		handleEditGear(data.id, "code", code);
	};
	const handleMaxDistanceChange = (distance: number) => {
		handleEditGear(data.id, "maximum_distance", distance);
	};

	return (
		<Box>
			<div className="relative flex justify-between items-center mb-4">
				<EditableText
					value={data.name}
					onSave={handleNameChange}
					className="text-xl font-semibold"
					placeholder="Enter gear name..."
				/>
				{isRetired && (
					<div className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
						Retired
					</div>
				)}
			</div>

			<SectionContainer hasBorder>
				<div className="space-y-2">
					<DatePicker
						date={data.dateBegin}
						label="Start Date"
						isEditable={false}
					/>
					<DatePicker
						date={data.dateEnd}
						onSave={handleEndDateChange}
						label="End Date"
						isEditable={!data.dateEnd}
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
							className={`h-2.5 rounded-full ${
								// eslint-disable-next-line no-nested-ternary
								usagePercentage > 80
									? "bg-red-500"
									: usagePercentage > 50
										? "bg-yellow-500"
										: "bg-green-500"
							}`}
							style={{ width: `${Math.min(usagePercentage, 100)}%` }}
						/>
					</div>
					<div
						className={cn(
							"flex justify-between items-center text-xs ",
							isDarkMode ? "text-white" : "text-gray-500",
						)}
					>
						<span>{formatDistance(0 /*data.total*/)}</span>
						{!data.dateEnd ? (
							<EditableNumber
								value={data.maximumDistance}
								onSave={handleMaxDistanceChange}
								className="text-right"
								formatValue={formatDistance}
							/>
						) : (
							<span className="px-2 py-1 -mx-2 text-right">
								{formatDistance(data.maximumDistance)}
							</span>
						)}
					</div>
				</div>
			</SectionContainer>

			<SectionContainer>
				<div className="flex items-center gap-2">
					<span className={cn("text-sm")}>Code:</span>
					{!data.dateEnd ? (
						<EditableText
							value={data.code}
							onSave={handleCodeChange}
							className="text-sm"
							placeholder="Enter gear code..."
						/>
					) : (
						<span className="text-sm">{data.code}</span>
					)}
				</div>
			</SectionContainer>
		</Box>
	);
};
