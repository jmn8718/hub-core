import { formatDate } from "@repo/dates";
import type { IInbodyData } from "@repo/types";
import { getDifferenceClassName } from "../utils/style.js";
import { Box } from "./Box.js";

interface InbodyHistoryTableProps {
	data: IInbodyData[];
	formatMeasurement: (value: number | null | undefined) => string;
}

export function InbodyHistoryTable({
	data,
	formatMeasurement,
}: InbodyHistoryTableProps) {
	if (!data.length) return null;

	const metricColumns: Array<{
		key: keyof IInbodyData;
		header: string;
		goodWhenNegative: boolean;
	}> = [
		{ key: "weight", header: "Weight (kg)", goodWhenNegative: true },
		{ key: "bmi", header: "BMI (kg/m²)", goodWhenNegative: true },
		{ key: "bodyFat", header: "Body Fat Mass (kg)", goodWhenNegative: true },
		{ key: "muscleMass", header: "Muscle Mass (kg)", goodWhenNegative: false },
		{
			key: "percentageBodyFat",
			header: "Body Fat (%)",
			goodWhenNegative: true,
		},
	];

	const formatDifference = (
		current: number | null | undefined,
		next: number | null | undefined,
	) => {
		if (
			current === null ||
			current === undefined ||
			next === null ||
			next === undefined
		) {
			return null;
		}

		const diff = current - next;
		if (diff === 0) return "0.0";

		const sign = diff > 0 ? "+" : "-";
		const formatted = formatMeasurement(Math.abs(diff));
		return `${sign}${formatted}`;
	};

	return (
		<Box classes="overflow-x-auto">
			<table className="min-w-full text-sm">
				<thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
					<tr className="border-b border-gray-200 dark:border-gray-700">
						<th className="px-3 py-2 text-left">Date</th>
						{metricColumns.map((column) => (
							<th key={column.key as string} className="px-3 py-2 text-left">
								{column.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{data.map((item, index) => {
						const next = data[index + 1];
						return (
							<tr
								key={item.id}
								className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
							>
								<td className="px-3 py-2">{formatDate(item.timestamp)}</td>
								{metricColumns.map(({ key, goodWhenNegative }) => {
									const currentValue = item[key] as number | null | undefined;
									const nextValue =
										(next?.[key as keyof IInbodyData] as
											| number
											| null
											| undefined) ?? null;
									const diffRaw =
										currentValue !== null &&
										currentValue !== undefined &&
										nextValue !== null &&
										nextValue !== undefined
											? currentValue - nextValue
											: null;

									const difference = formatDifference(currentValue, nextValue);
									let diffLabel = difference ? `Δ ${difference}` : "";
									const diffClassName = getDifferenceClassName(
										diffRaw,
										goodWhenNegative,
									);

									if (difference === "0.0") {
										diffLabel = "";
									} else if (difference) {
										const isNegativeDiff = difference.startsWith("-");
										const arrow = isNegativeDiff ? "▼" : "▲";
										const magnitude = difference.replace(/^[-+]/, "");
										diffLabel = `${arrow} ${magnitude}`;
									}

									return (
										<td key={key as string} className="px-3 py-2">
											<div className="flex items-end gap-2">
												<span className="text-sm font-semibold">
													{formatMeasurement(currentValue)}
												</span>
												<span
													className={`text-xs font-medium ${diffClassName}`}
												>
													{diffLabel}
												</span>
											</div>
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</Box>
	);
}
