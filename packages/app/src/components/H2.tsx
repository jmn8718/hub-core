import { cn } from "@repo/ui";
import type React from "react";
import { useTheme } from "../contexts/ThemeContext.js";

interface PageH2Props {
	text: string;
	classes?: string;
}

export const H2: React.FC<PageH2Props> = ({ text, classes = "" }) => {
	const { isDarkMode } = useTheme();

	return (
		<div
			className={cn(
				"text-2xl font-semibold",
				isDarkMode ? "text-white" : "text-gray-800",
				classes || "",
			)}
		>
			{text}
		</div>
	);
};
