import { cn } from "@repo/ui";
import type React from "react";
import { getDifferenceClassName } from "../utils/style.js";

interface ValueTrendProps {
	value: string;
	difference?: number | null;
	goodWhenNegative?: boolean;
	formatter?: (value: number) => string;
	className?: string;
	valueClassName?: string;
	neutralFallback?: string;
	neutralClassName?: string;
	trendClassName?: string;
	showArrows?: boolean;
}

export const ValueTrend: React.FC<ValueTrendProps> = ({
	value,
	difference,
	goodWhenNegative = false,
	formatter,
	className,
	valueClassName,
	neutralFallback = "",
	neutralClassName,
	trendClassName,
	showArrows = false,
}) => {
	const diff =
		typeof difference === "number" && !Number.isNaN(difference)
			? difference
			: null;

	let trendText = neutralFallback;
	let trendClass = neutralClassName || "text-gray-400";

	if (diff !== null) {
		const magnitude = formatter
			? formatter(Math.abs(diff))
			: Math.abs(diff).toString();

		if (diff !== 0) {
			const sign = diff > 0 ? "+" : "-";
			trendText = showArrows
				? `${diff > 0 ? "▲" : "▼"} ${magnitude}`
				: `${sign}${magnitude}`;
			trendClass = getDifferenceClassName(diff, goodWhenNegative);
		}
	}

	return (
		<span className={cn("flex items-baseline gap-2", className)}>
			<span className={valueClassName}>{value}</span>
			{trendText ? (
				<span className={cn("text-sm font-medium", trendClass, trendClassName)}>
					{trendText}
				</span>
			) : null}
		</span>
	);
};
