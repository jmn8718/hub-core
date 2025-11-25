import { cn } from "@repo/ui";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import { createElement } from "react";
import { useTheme } from "../contexts/ThemeContext.js";
import type { ThemeColors } from "../utils/style.js";

type Variant = "description" | "default";
interface PageTextProps {
	text: string;
	className?: string;
	variant?: Variant;
	icon?: LucideIcon;
}

const getVariantClass = (variant: Variant, colors: ThemeColors) => {
	if (variant === "description") {
		return colors.description;
	}
	return colors.text;
};

export const Text: React.FC<PageTextProps> = ({
	text,
	icon,
	className = "",
	variant = "default",
}) => {
	const { colors } = useTheme();
	const textColor = getVariantClass(variant, colors);
	const classes = cn(
		"text-sm m-0 p-0",
		textColor,
		className || "",
		icon ? "flex items-center gap-2" : "",
	);
	return (
		<p className={classes}>
			{icon && createElement(icon, { size: 16, className: textColor })}
			{text}
		</p>
	);
};
