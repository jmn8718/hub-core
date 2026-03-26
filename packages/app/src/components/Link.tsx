import { cn } from "@repo/ui";
import type React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext.js";

export const Link: React.FC<{
	href: string;
	icon: React.ReactNode;
	label: string;
}> = ({ href, icon, label }) => {
	const location = useLocation();
	const { colors } = useTheme();
	const isActive = location.pathname === href;

	return (
		<RouterLink
			to={href}
			className={cn(
				"relative group flex h-12 w-12 items-center justify-center rounded-lg",
				isActive ? colors.navActive : colors.navHover,
			)}
			aria-label={label}
			title={label}
		>
			<div className={cn(isActive ? "text-current" : colors.navIcon)}>
				{icon}
			</div>
			<span
				className={cn(
					"pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded px-2 py-1 text-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
					colors.tooltip,
				)}
			>
				{label}
			</span>
		</RouterLink>
	);
};
