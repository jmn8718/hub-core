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

export function LineChart({ data, unit = "", property }: LineChartProps) {
	const { isDarkMode } = useTheme();

	const strokeColor = isDarkMode ? "#d2d1e0ff" : "#000";
	const gridStrokeColor = isDarkMode ? "#ffffff44" : "#00000022";
	const formatUnit = (value: string | number | undefined) => {
		if (!value) return "";
		return unit ? `${value} ${unit}` : value.toString();
	};
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
				fill={strokeColor}
				fontSize={14}
				textAnchor="middle"
			>
				{formatUnit(value)}
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
				<p className="capitalize">{`${property}: ${formatUnit(currentValue / 100)}`}</p>
				{itemIndex > 0 && (
					<p className="capitalize">{`Variation: ${formatUnit(variation / 100)}`}</p>
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
					fill={gridStrokeColor}
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
					<CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
					<XAxis
						dataKey="date"
						ticks={xTicks}
						interval={0}
						tick={CustomizedAxisTick}
						padding={{ left: 30, right: 30 }}
						height={xAxisTickHeight}
						stroke={gridStrokeColor}
						tickMargin={12}
					/>
					<YAxis
						domain={[minDomain, maxDomain]}
						ticks={yTicks}
						unit={unit}
						stroke={gridStrokeColor}
						padding={{ top: 30, bottom: 10 }}
						tick={{ fill: gridStrokeColor }}
					/>
					<Tooltip content={CustomTooltip} />
					<Line
						type="linear"
						dataKey={property}
						stroke={strokeColor}
						strokeWidth={2}
						dot={{ r: 4 }}
						label={CustomizedLabel}
					/>
				</RechartsLineChart>
			</ResponsiveContainer>
		</Box>
	);
}
