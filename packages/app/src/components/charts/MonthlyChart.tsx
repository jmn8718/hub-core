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
import { Box } from "../Box.js";
import { H2 } from "../H2.js";

interface MonthlyData {
	month: string;
	count: number;
	distance: number;
}

interface MonthlyActivityChartProps {
	data: MonthlyData[];
}

export const MonthlyActivityChart: React.FC<MonthlyActivityChartProps> = ({
	data,
}: MonthlyActivityChartProps) => {
	const { isDarkMode } = useTheme();
	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			return (
				<div
					className={`p-2 rounded-lg shadow-lg ${
						isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
					}`}
				>
					<p className="font-semibold">Month {payload[0].payload.month}</p>
					<p>{formatDistance(payload[0].value)}</p>
				</div>
			);
		}
		return null;
	};

	return (
		<Box classes="h-96 min-h-fit">
			<H2 text="Monthly Distance" />
			{data.length > 0 && (
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
					>
						<XAxis
							dataKey="month"
							angle={-45}
							textAnchor="end"
							height={108}
							tick={{
								fill: isDarkMode ? "#9CA3AF" : "#4B5563",
								fontSize: 12,
							}}
						/>
						<YAxis
							tickFormatter={(value) => `${value / 1000}km`}
							tick={{
								fill: isDarkMode ? "#9CA3AF" : "#4B5563",
								fontSize: 12,
							}}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Bar
							dataKey="distance"
							fill={isDarkMode ? "#3B82F6" : "#2563EB"}
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>
			)}
		</Box>
	);
};
