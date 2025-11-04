import { dayjs } from "@repo/dates";
import type React from "react";
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useTheme } from "../../contexts/ThemeContext.js";
import { formatDistance } from "../../utils/formatters.js";

type DailyChartEntry = {
	date: string;
	label: string;
	distance: number;
};

interface DailyDistanceChartProps {
	data: DailyChartEntry[];
}

export const DailyDistanceChart: React.FC<DailyDistanceChartProps> = ({
	data,
}) => {
	const { isDarkMode } = useTheme();
	const axisColor = isDarkMode ? "#9CA3AF" : "#4B5563";

	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart
				data={data}
				margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
			>
				<XAxis
					dataKey="label"
					tick={{
						fill: axisColor,
						fontSize: 12,
					}}
				/>
				<YAxis
					tickFormatter={(value: number) =>
						value ? `${(value / 1000).toFixed(0)}km` : "0km"
					}
					tick={{
						fill: axisColor,
						fontSize: 12,
					}}
				/>
				<Tooltip
					cursor={{ fill: isDarkMode ? "#1f2937" : "#e5e7eb" }}
					content={({ active, payload }) => {
						if (active && payload && payload.length) {
							const entry = payload[0]?.payload as {
								date: string;
								distance: number;
							};
							return (
								<div
									className={`rounded-md px-3 py-2 text-sm shadow ${
										isDarkMode
											? "bg-gray-900 text-white"
											: "bg-white text-gray-900"
									}`}
								>
									<p className="font-semibold">
										{dayjs(entry.date).format("MMM D, YYYY")}
									</p>
									<p>{formatDistance(entry.distance)}</p>
								</div>
							);
						}
						return null;
					}}
				/>
				<Bar
					dataKey="distance"
					fill={isDarkMode ? "#3B82F6" : "#2563EB"}
					radius={[8, 8, 0, 0]}
					barSize={12}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
};
