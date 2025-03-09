import { cn } from "@repo/ui";
import type React from "react";
import { useTheme } from "../contexts/ThemeContext.js";

interface PageTextProps {
	text: string;
	className?: string;
}

export const Text: React.FC<PageTextProps> = ({ text, className = "" }) => {
	const { isDarkMode } = useTheme();

	return (
		<span
			className={cn(
				"text-sm",
				isDarkMode ? "text-gray-300" : "text-gray-700",
				className || "",
			)}
		>
			{text}
		</span>
	);
};
