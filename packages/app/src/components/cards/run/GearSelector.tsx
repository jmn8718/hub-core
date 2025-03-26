import type { GearType, IDbGear } from "@repo/types";
import { cn } from "@repo/ui";
import { Plus, X } from "lucide-react";
import { useMemo } from "react";
import { useTheme } from "../../../contexts/ThemeContext.js";
import { isSameOrAfterDay, isSameOrBeforeDay } from "../../../utils/date.js";

interface GearSelectorProps {
	activityDate: string;
	type: GearType;
	availableGear: IDbGear[];
	// eslint-disable-next-line react/require-default-props
	selectedGearId?: string;
	onSelect: (gearId: string) => Promise<void>;
	onRemove: (gearId: string) => Promise<void>;
}

// eslint-disable-next-line react/function-component-definition
const GearSelector: React.FC<GearSelectorProps> = ({
	activityDate,
	type,
	availableGear,
	selectedGearId,
	onSelect,
	onRemove,
}) => {
	const { isDarkMode } = useTheme();
	const filteredGear = availableGear
		.filter((gear) => gear.type === type)
		.filter(
			(gear) =>
				(gear.dateBegin
					? isSameOrAfterDay(gear.dateBegin, activityDate)
					: true) &&
				(gear.dateEnd ? isSameOrBeforeDay(gear.dateEnd, activityDate) : true),
		);

	const selectedGear = useMemo(() => {
		if (!selectedGearId) return undefined;
		return availableGear.find(({ id }) => id === selectedGearId);
	}, [selectedGearId, availableGear]);

	if (selectedGear) {
		// console.log('s', selectedGear)
		return (
			<div
				className={cn(
					"flex items-center justify-between gap-2 p-2 rounded-lg",
					isDarkMode ? "bg-gray-700" : "bg-gray-100",
				)}
			>
				<span
					className={cn(
						"text-sm",
						isDarkMode ? "text-gray-200" : "text-gray-700",
					)}
				>
					{selectedGear.name}
				</span>
				<button
					type="button"
					onClick={() => onRemove(selectedGear.id)}
					className={cn(
						"p-1 rounded-full",
						isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-200",
					)}
					title="Remove gear"
				>
					<X
						size={14}
						className={isDarkMode ? "text-gray-400" : "text-gray-500"}
					/>
				</button>
			</div>
		);
	}

	return (
		<div className="relative">
			<select
				disabled={filteredGear.length === 0}
				onChange={(e) => {
					const gear = filteredGear.find((g) => g.id === e.target.value);
					if (gear) {
						onSelect(gear.id);
					}
				}}
				className={`w-full pl-3 pr-8 py-2 text-sm rounded-lg border appearance-none ${
					isDarkMode
						? "bg-gray-700 border-gray-600 text-white"
						: "bg-white border-gray-300 text-gray-900"
				} focus:outline-none focus:ring-2 focus:ring-blue-500`}
				value=""
			>
				<option value="" disabled>
					Add {type.toLowerCase()}
				</option>
				{filteredGear.map((gear) => (
					<option key={gear.id} value={gear.id}>
						{gear.name} ({gear.code})
					</option>
				))}
			</select>
			<Plus
				size={14}
				className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
					isDarkMode ? "text-gray-400" : "text-gray-500"
				}`}
			/>
		</div>
	);
};

export default GearSelector;
