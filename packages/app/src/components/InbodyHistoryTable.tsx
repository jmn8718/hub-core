import { formatDate } from "@repo/dates";
import type { IInbodyData } from "@repo/types";
import { Box } from "./Box.js";
import { ValueTrend } from "./ValueTrend.js";

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

									return (
										<td key={key as string} className="px-3 py-2">
											<ValueTrend
												value={formatMeasurement(currentValue)}
												difference={diffRaw}
												goodWhenNegative={goodWhenNegative}
												formatter={(value) => formatMeasurement(value)}
												className="flex items-end gap-2"
												valueClassName="text-sm font-semibold"
												trendClassName="text-xs font-medium"
												neutralClassName="text-xs text-gray-400"
												showArrows
											/>
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
