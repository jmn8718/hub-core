import { formatDate } from "@repo/dates";
import type { IInbodyData } from "@repo/types";
import { cn } from "@repo/ui";
import { useTheme } from "../contexts/index.js";
import { formatMeasurement } from "../utils/formatters.js";
import { Box } from "./Box.js";
import { Text } from "./Text.js";
import { ValueTrend } from "./ValueTrend.js";

interface SummaryRow {
	label: string;
	value: number | null | undefined;
	previous?: number | null;
	unit?: string;
	fractionDigits?: number;
	goodWhenNegative: boolean;
}

interface InbodySummaryProps {
	current: IInbodyData;
	previous?: IInbodyData;
}

export function InbodySummary({ current, previous }: InbodySummaryProps) {
	const { isDarkMode } = useTheme();
	const summaryRows: SummaryRow[] = [
		{
			label: "Weight",
			value: current.weight,
			previous: previous?.weight ?? null,
			unit: "kg",
			goodWhenNegative: true,
		},
		{
			label: "BMI",
			value: current.bmi,
			previous: previous?.bmi ?? null,
			unit: "kg/m²",
			fractionDigits: 1,
			goodWhenNegative: true,
		},
		{
			label: "Body Fat Mass",
			value: current.bodyFat,
			previous: previous?.bodyFat ?? null,
			unit: "kg",
			goodWhenNegative: true,
		},
		{
			label: "Muscle Mass",
			value: current.muscleMass,
			previous: previous?.muscleMass ?? null,
			unit: "kg",
			goodWhenNegative: false,
		},
		{
			label: "Body Fat %",
			value: current.percentageBodyFat,
			previous: previous?.percentageBodyFat ?? null,
			unit: "%",
			goodWhenNegative: true,
		},
	];

	return (
		<Box classes="space-y-2">
			<Text
				text={formatDate(current.timestamp)}
				className="text-xl font-medium italic"
			/>
			<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
				{summaryRows.map(
					({
						label,
						value,
						previous: previousValue,
						unit,
						fractionDigits,
						goodWhenNegative,
					}) => {
						const digits = fractionDigits ?? 1;
						const displayValue = formatMeasurement(value, digits);
						const hasDiff =
							value !== null &&
							value !== undefined &&
							previousValue !== null &&
							previousValue !== undefined;
						const diffRaw =
							hasDiff && value !== null && previousValue !== null
								? (value as number) - (previousValue as number)
								: null;

						return (
							<div key={label} className="flex flex-col gap-1">
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
									<ValueTrend
										value={displayValue}
										difference={diffRaw}
										goodWhenNegative={goodWhenNegative}
										formatter={(difference) =>
											(difference / 100).toFixed(digits)
										}
										valueClassName={cn(
											"text-lg font-semibold",
											isDarkMode ? "text-gray-50" : "text-gray-900",
										)}
										showArrows
										neutralClassName={
											isDarkMode ? "text-gray-400" : "text-gray-500"
										}
									/>
								</div>
							</div>
						);
					},
				)}
			</div>
		</Box>
	);
}
