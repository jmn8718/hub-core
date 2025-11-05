import { formatDate } from "@repo/dates";
import { cn } from "@repo/ui";
import {
	CartesianGrid,
	type LabelProps,
	Line,
	LineChart as RechartsLineChart,
	ResponsiveContainer,
	Tooltip,
	type TooltipProps,
	XAxis,
	YAxis,
} from "recharts";
import type {
	NameType,
	ValueType,
} from "recharts/types/component/DefaultTooltipContent.js";
import { useTheme } from "../contexts/index.js";
import { Box } from "./Box.js";

export interface LineChartProps {
	property: "weight" | "bmi";
	unit?: string;
	data: { index: number; date: string; weight: number; bmi: number }[];
}

const themeColors = {
	light: {
		stroke: "#000000cc",
		gridStroke: "#00000055",
	},
	dark: {
		stroke: "#d2d1e0ff",
		gridStroke: "#ffffff44",
	},
};

const formatUnit = (
	value: string | number | undefined,
	unit: string | undefined,
) => {
	if (!value) return "";
	return unit ? `${value} ${unit}` : value.toString();
};
export function LineChart({ data, unit = "", property }: LineChartProps) {
	const { isDarkMode } = useTheme();
	const colors = themeColors[isDarkMode ? "dark" : "light"];
	const values = data.map((entry) => entry[property]);
	const xTicks = data.map((entry) => entry.date);
	const baseChartHeight = 200;
	const xAxisTickHeight = 20;
	const chartHeight = baseChartHeight + xAxisTickHeight;

	const CustomizedLabel = ({ x, y, value }: LabelProps) => {
		return (
			<text
				x={x}
				y={y}
				dy={-8}
				fill={colors.stroke}
				fontSize={14}
				textAnchor="middle"
			>
				{formatUnit(value, unit)}
			</text>
		);
	};

	const minValue = values.length ? Math.min(...values) : 0;
	const maxValue = values.length ? Math.max(...values) : 1;

	let minDomain = Math.floor(minValue / 100);
	let maxDomain = Math.ceil(maxValue / 100);
	const yTicks: number[] = [];

	if (minDomain === maxDomain) {
		minDomain -= 1;
		maxDomain += 1;
	}

	for (let value = minDomain; value <= maxDomain; value += 1) {
		yTicks.push(value);
	}

	const CustomTooltip = ({
		active,
		payload,
		label,
	}: TooltipProps<ValueType, NameType>) => {
		const item = payload?.length ? payload[0] : null;
		const itemIndex = item ? (item.payload.index as number) : -1;
		const currentItem = data[itemIndex];
		const previousItem =
			itemIndex > 0 && data[itemIndex - 1] ? data[itemIndex - 1] : null;
		const currentValue = currentItem ? currentItem[property] : 0;
		const variation = previousItem ? currentValue - previousItem[property] : 0;
		return (
			<div
				className={cn(
					"border p-2 rounded shadow-lg",
					isDarkMode
						? "bg-gray-800 border-gray-600"
						: "bg-white border-gray-300",
				)}
			>
				<p className="label">{`Date: ${formatDate(label)}`}</p>
				<p className="capitalize">{`${property}: ${formatUnit(currentValue / 100, unit)}`}</p>
				{itemIndex > 0 && (
					<p className="capitalize">{`Variation: ${formatUnit(variation / 100, unit)}`}</p>
				)}
			</div>
		);
	};

	const CustomizedAxisTick = ({
		x,
		y,
		payload,
	}: { x: number; y: number; payload: { value: string } }) => {
		return (
			<g transform={`translate(${x},${y})`}>
				<text
					x={0}
					y={0}
					dy={0}
					textAnchor="end"
					fill={colors.gridStroke}
					transform="rotate(-15)"
				>
					{formatDate(payload.value, { format: "YY/MM/DD" })}
				</text>
			</g>
		);
	};
	return (
		<Box>
			<ResponsiveContainer width="100%" height={chartHeight}>
				<RechartsLineChart
					data={data.map((d) => ({ ...d, [property]: d[property] / 100 }))}
					margin={{ top: 8, right: 8, bottom: xAxisTickHeight, left: 0 }}
				>
					<CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} />
					<XAxis
						dataKey="date"
						ticks={xTicks}
						interval={0}
						tick={CustomizedAxisTick}
						padding={{ left: 30, right: 30 }}
						height={xAxisTickHeight}
						stroke={colors.gridStroke}
						tickMargin={12}
					/>
					<YAxis
						domain={[minDomain, maxDomain]}
						ticks={yTicks}
						unit={unit}
						stroke={colors.gridStroke}
						padding={{ top: 30, bottom: 10 }}
						tick={{ fill: colors.gridStroke }}
					/>
					<Tooltip content={CustomTooltip} />
					<Line
						type="linear"
						dataKey={property}
						stroke={colors.stroke}
						strokeWidth={2}
						dot={{ r: 4 }}
						label={CustomizedLabel}
					/>
				</RechartsLineChart>
			</ResponsiveContainer>
		</Box>
	);
}
