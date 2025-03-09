import { cn } from "@repo/ui";
import type React from "react";
import { useTheme } from "../contexts/ThemeContext.js";

interface PageBoxProps {
	children: React.ReactNode;
	classes?: string;
}

export const Box: React.FC<PageBoxProps> = ({ children, classes = "" }) => {
	const { isDarkMode } = useTheme();

	return (
		<div
			className={cn(
				"rounded-lg shadow-lg p-4 space-y-4 transition-all hover:shadow-lg relative",
				isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800",
				classes || "",
			)}
		>
			{children}
		</div>
	);
};
