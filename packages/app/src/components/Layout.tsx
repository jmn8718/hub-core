import { AppType } from "@repo/types";
import { cn } from "@repo/ui";
import {
	Atom,
	BookHeart,
	CalendarDays,
	ChartSpline,
	Database,
	Dumbbell,
	Home,
	PlusSquare,
	Settings,
} from "lucide-react";
import type React from "react";
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Routes as AppRoutes } from "../constants.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { Sidebar } from "./Sidebar.js";

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	const { isDarkMode } = useTheme();
	const { type } = useDataClient();
	const location = useLocation();
	const isCalendarRoute = location.pathname === AppRoutes.CALENDAR;

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useLayoutEffect(() => {
		if (typeof window !== "undefined") {
			window.scrollTo(0, 0);
		}
	}, [location.pathname]);

	return (
		<div
			className={cn(
				"min-h-screen transition-colors duration-200",
				isDarkMode ? "bg-gray-900" : "bg-gray-100",
			)}
		>
			<Sidebar
				sidebarItems={[
					{ icon: Home, href: AppRoutes.HOME, label: "Home" },
					{ icon: Database, href: AppRoutes.DATA, label: "Data" },
					{ icon: CalendarDays, href: AppRoutes.CALENDAR, label: "Calendar" },
					{ icon: PlusSquare, href: AppRoutes.ADD, label: "Add Activity" },
					{ icon: BookHeart, href: AppRoutes.INBODY, label: "Inbody" },
					{ icon: ChartSpline, href: AppRoutes.ANALYTICS, label: "Analytics" },
					{
						icon: Atom,
						href: AppRoutes.PROVIDERS,
						label: "Providers",
						hideOnWeb: true,
					},
					{ icon: Dumbbell, href: AppRoutes.GEAR, label: "Gear" },
					{ icon: Settings, href: AppRoutes.SETTINGS, label: "Settings" },
				]}
			/>
			<div
				className={cn(
					"min-h-screen p-0",
					type === AppType.DESKTOP ? "pl-16" : "pl-12",
				)}
			>
				<div
					className={cn(
						"min-h-screen flex flex-col p-2 md:p-4",
						isCalendarRoute ? "mx-0 max-w-none" : "mx-auto max-w-4xl",
					)}
				>
					{children}
				</div>
				<ToastContainer position="bottom-right" autoClose={3000} />
			</div>
		</div>
	);
};
