import { formatDate } from "@repo/dates";
import type { IInbodyData } from "@repo/types";
import { cn } from "@repo/ui";
import { useTheme } from "../contexts/index.js";
import { Box } from "./Box.js";

interface SummaryRow {
	label: string;
	value: number | null | undefined;
	previous?: number | null;
	unit?: string;
	fractionDigits?: number;
}

interface InbodySummaryProps {
	current: IInbodyData;
	previous?: IInbodyData;
}

const formatMeasurement = (
	value: number | null | undefined,
	fractionDigits = 1,
) => {
	if (value === null || value === undefined) {
		return "-";
	}
	return (value / 100).toFixed(fractionDigits);
};

const getVariation = (
	current: number | null | undefined,
	previous: number | null | undefined,
	fractionDigits = 1,
) => {
	if (
		current === null ||
		current === undefined ||
		previous === null ||
		previous === undefined
	) {
		return null;
	}
	const diff = (current - previous) / 100;
	const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
	return `${sign}${Math.abs(diff).toFixed(fractionDigits)}`;
};

export function InbodySummary({ current, previous }: InbodySummaryProps) {
	const { isDarkMode } = useTheme();
	const summaryRows: SummaryRow[] = [
		{
			label: "Weight",
			value: current.weight,
			previous: previous?.weight ?? null,
			unit: "kg",
		},
		{
			label: "BMI",
			value: current.bmi,
			previous: previous?.bmi ?? null,
			unit: "kg/m²",
			fractionDigits: 1,
		},
		{
			label: "Body Fat Mass",
			value: current.bodyFat,
			previous: previous?.bodyFat ?? null,
			unit: "kg",
		},
		{
			label: "Muscle Mass",
			value: current.muscleMass,
			previous: previous?.muscleMass ?? null,
			unit: "kg",
		},
		{
			label: "Body Fat %",
			value: current.percentageBodyFat,
			previous: previous?.percentageBodyFat ?? null,
			unit: "%",
		},
	];

	return (
		<Box classes="space-y-3">
			<div
				className={cn(
					"pl-2 text-lg font-medium",
					isDarkMode ? "text-gray-50" : "text-gray-900",
				)}
			>
				{formatDate(current.timestamp)}
			</div>
			<div className="grid gap-2 sm:grid-cols-2">
				{summaryRows.map(
					({ label, value, previous: previousValue, unit, fractionDigits }) => {
						const displayValue = formatMeasurement(value, fractionDigits);
						const variation = previous
							? getVariation(value, previousValue, fractionDigits)
							: null;

						const variationContent = variation ?? "--";

						const isNegative = !!variation?.startsWith("-");
						const isPositive = !!variation?.startsWith("+");

						const variationClassName =
							isNegative && label === "Muscle Mass"
								? "text-rose-500"
								: isNegative
									? "text-emerald-500"
									: isPositive
										? "text-rose-500"
										: "text-gray-400";

						return (
							<div key={label} className="flex flex-col gap-1 p-2">
								<div
									className={cn(
										"flex items-baseline justify-between text-xs uppercase tracking-wide",
										isDarkMode ? "text-white" : "text-gray-500",
									)}
								>
									<span>
										{label}
										{unit ? ` (${unit})` : ""}
									</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span
										className={cn(
											"text-lg font-semibold",
											isDarkMode ? "text-gray-50" : "text-gray-900",
										)}
									>
										{displayValue}
										<span className={`ml-2 text-sm ${variationClassName}`}>
											{variationContent}
										</span>
									</span>
								</div>
							</div>
						);
					},
				)}
			</div>
		</Box>
	);
}
