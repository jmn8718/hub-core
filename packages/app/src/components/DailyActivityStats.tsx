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
			label: "text-xl sm:text-2xl",
			value: "text-[clamp(2.5rem,18vw,4rem)] sm:text-6xl",
			units: "text-md",
		},
	}[size];
	return (
		<div className="flex min-w-0 flex-col gap-2">
			<span
				className={cn(
					"text-md overflow-wrap-anywhere uppercase tracking-wide",
					fonts.label,
					textClass,
				)}
			>
				{label}
			</span>
			<div className="flex min-w-0 flex-wrap items-baseline gap-x-1">
				<span
					className={cn(
						"min-w-0 max-w-full break-words font-bold italic leading-none",
						fonts.value,
					)}
				>
					{value}
				</span>
				<span
					className={cn(
						"shrink-0 align-baseline italic",
						fonts.units,
						textClass,
					)}
				>
					{units}
				</span>
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
		<div className="flex min-w-0 flex-col gap-4 px-2 py-2 sm:px-4">
			<DataDisplay
				label="Distance"
				textClass={subtleTextClass}
				value={formatDistance(totalDistance, false)}
				units="km"
				size="lg"
			/>
			<div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6">
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
