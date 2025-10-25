import { cn } from "@repo/ui";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { useTheme } from "../contexts/ThemeContext.js";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	isActive?: boolean;
}

const colors = {
	dark: {
		active: "border-blue-600 text-white bg-blue-600 hover:bg-blue-700",
		inactive: "border-gray-600 text-white",
	},
	light: {
		active: "border-blue-500 bg-blue-500 hover:bg-blue-600 text-white",
		inactive:
			"border-gray-400 bg-transparent text-gray-700 hover:border-indigo-400",
	},
};
export function Button({
	children,
	isActive = false,
	className,
	...props
}: PropsWithChildren<ButtonProps>) {
	const { isDarkMode } = useTheme();
	return (
		<button
			type="button"
			className={cn(
				"rounded-full border px-4 py-2 text-sm font-medium transition-colors",
				colors[isDarkMode ? "dark" : "light"][isActive ? "active" : "inactive"],
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
