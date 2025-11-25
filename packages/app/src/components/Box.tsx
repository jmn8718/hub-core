import { cn } from "@repo/ui";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import { createElement } from "react";
import { useTheme } from "../contexts/ThemeContext.js";
import { Text } from "./Text.js";

interface PageBoxProps {
	children: React.ReactNode;
	classes?: string;
	title?: string;
	description?: string;
	icon?: LucideIcon;
}

export const Box: React.FC<PageBoxProps> = ({
	children,
	classes = "",
	icon,
	title,
	description,
}) => {
	const { isDarkMode } = useTheme();

	return (
		<div
			className={cn(
				"rounded-lg shadow-lg p-4 space-y-4 transition-all hover:shadow-lg relative",
				isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800",
				classes || "",
			)}
		>
			{(title || description) && (
				<div>
					{title && (
						<Text className="text-sm font-semibold" text={title} icon={icon} />
					)}
					{description && (
						<Text
							className="text-xs pt-1"
							variant="description"
							text={description}
						/>
					)}
				</div>
			)}
			{children}
		</div>
	);
};
