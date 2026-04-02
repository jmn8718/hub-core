import { AppType } from "@repo/types";
import { cn } from "@repo/ui";
import type { LucideProps } from "lucide-react";
import type React from "react";
import { Link, useLocation } from "react-router-dom";
import { Routes as AppRoutes } from "../constants.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";

export function Sidebar({
	sidebarItems,
}: {
	sidebarItems: {
		icon: React.ForwardRefExoticComponent<
			Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
		>;
		href: string;
		label: string;
		hideOnWeb?: boolean;
	}[];
}) {
	const { colors } = useTheme();
	const { type } = useDataClient();
	const location = useLocation();
	return (
		<aside
			className={cn(
				"fixed left-0 top-0 z-40 h-full shadow-lg flex flex-col items-center py-6 transition-colors duration-200",
				colors.navSurface,
				type === AppType.DESKTOP ? "w-16" : "w-12",
			)}
		>
			<nav className="flex flex-col items-center space-y-4">
				{sidebarItems.map(({ icon: Icon, href, label, hideOnWeb }) => (
					<Link
						key={href}
						to={href}
						onClick={() => {
							if (
								href === AppRoutes.CALENDAR &&
								typeof window !== "undefined"
							) {
								window.scrollTo(0, 0);
							}
						}}
						className={cn(
							"relative group flex items-center justify-center w-8 h-8 rounded-lg",
							colors.navHover,
							type === AppType.DESKTOP ? "w-12 h-12" : "w-8 h-8",
							type === AppType.WEB && hideOnWeb && "hidden",
							location.pathname === href && colors.navActive,
						)}
						aria-label={label}
						title={label}
					>
						<Icon
							size={24}
							className={cn(
								"h-6 w-6",
								location.pathname === href ? "text-current" : colors.navIcon,
							)}
						/>
						<span
							className={cn(
								"pointer-events-none absolute left-full z-50 ml-2 rounded px-2 py-1 text-sm whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100",
								colors.tooltip,
							)}
						>
							{label}
						</span>
					</Link>
				))}
			</nav>
		</aside>
	);
}
