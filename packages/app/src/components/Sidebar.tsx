import { AppType } from "@repo/types";
import { cn } from "@repo/ui";
import type { LucideProps } from "lucide-react";
import type React from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
	}[];
}) {
	const { isDarkMode } = useTheme();
	const { type } = useDataClient();
	const location = useLocation();
	const navigation = useNavigate();
	return (
		<aside
			className={cn(
				"fixed left-0 top-0 h-full shadow-lg flex flex-col items-center py-6 transition-colors duration-200",
				"fixed left-0 top-0 h-full shadow-lg flex flex-col items-center py-6 transition-colors duration-200",
				isDarkMode ? "bg-gray-800" : "bg-white",
				type === AppType.DESKTOP ? "w-16" : "w-12",
			)}
		>
			<nav className="flex flex-col items-center space-y-4">
				{sidebarItems.map(({ icon: Icon, href, label }) => (
					<button
						key={href}
						type="button"
						onClick={() => navigation(href)}
						className={cn(
							"relative group flex items-center justify-center w-8 h-8 rounded-lg",
							isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-200",
							type === AppType.DESKTOP ? "w-12 h-12" : "w-8 h-8",
						)}
					>
						<Icon
							size={24}
							color={
								location.pathname === href
									? isDarkMode
										? "white"
										: "black"
									: "gray"
							}
						/>
						<span
							className={cn(
								"sr-only absolute left-full ml-2 px-2 py-1",
								"text-white text-sm rounded opacity-0 group-hover:opacity-100 whitespace-nowrap",
								isDarkMode ? "bg-gray-700" : "bg-gray-800",
							)}
						>
							{label}
						</span>
					</button>
				))}
			</nav>
		</aside>
	);
}
