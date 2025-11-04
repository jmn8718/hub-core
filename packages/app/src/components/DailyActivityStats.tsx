import { cn } from "@repo/ui";
import { useTheme } from "../contexts/index.js";
import { formatDistance, formatDuration } from "../utils/formatters.js";

interface DailyActivityStatsProps {
	totalDistance: number;
	totalDuration: number;
	activeDays: number;
}

const DataDisplay = ({
	label,
	textClass,
	value,
	units,
	size = "md",
}: {
	size?: "md" | "lg";
	units?: string;
	label: string;
	textClass: string;
	value: string;
}) => {
	const fonts = {
		md: {
			label: "text-lg",
			value: "text-2xl",
			units: "text-md",
		},
		lg: {
			label: "text-2xl",
			value: "text-6xl",
			units: "text-md",
		},
	}[size];
	return (
		<div className="flex flex-col gap-2">
			<span
				className={cn(
					"text-md uppercase tracking-wide",
					fonts.label,
					textClass,
				)}
			>
				{label}
			</span>
			<div className="flex gap-x-1 items-end">
				<span className={cn("italic font-bold", fonts.value)}>{value}</span>
				<span className={cn("italic", fonts.units, textClass)}>{units}</span>
			</div>
		</div>
	);
};

export const DailyActivityStats: React.FC<DailyActivityStatsProps> = ({
	totalDistance,
	totalDuration,
	activeDays,
}) => {
	const { isDarkMode } = useTheme();
	const subtleTextClass = isDarkMode ? "text-gray-400" : "text-gray-500";

	return (
		<div className="flex flex-col gap-4 px-4 py-2">
			<DataDisplay
				label="Distance"
				textClass={subtleTextClass}
				value={formatDistance(totalDistance, false)}
				units="km"
				size="lg"
			/>
			<div className="flex flex-col sm:gap-6 sm:flex-row">
				<DataDisplay
					label="Time"
					textClass={subtleTextClass}
					value={formatDuration(totalDuration)}
				/>
				<DataDisplay
					label="Days"
					textClass={subtleTextClass}
					value={activeDays.toFixed()}
				/>
			</div>
		</div>
	);
};
