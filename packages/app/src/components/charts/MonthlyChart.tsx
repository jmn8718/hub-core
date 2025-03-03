import type React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "../../contexts/ThemeContext.js";
import { formatDistance } from "../../utils/formatters.js";

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
          <p className="font-semibold">Month {label}</p>
          <p>{formatDistance(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } rounded-lg shadow-md p-6`}
    >
      <h3
        className={`text-lg font-semibold mb-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Monthly Distance
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 5, bottom: 20, left: 0 }}
          >
            <XAxis
              dataKey="month"
              angle={-45}
              textAnchor="end"
              height={60}
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
      </div>
    </div>
  );
};
