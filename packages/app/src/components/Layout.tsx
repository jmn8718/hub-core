import { cn } from "@repo/ui";
import { Database, Home, Settings } from "lucide-react";
import type React from "react";
import { ToastContainer } from "react-toastify";
import { Routes as AppRoutes } from "../constants.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { Sidebar } from "./Sidebar.js";

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	const { isDarkMode } = useTheme();

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
					// { icon: Table, href: AppRoutes.TABLE, label: "Table" },
					// { icon: Atom, href: AppRoutes.PROVIDERS, label: "Providers" },
					// { icon: Dumbbell, href: AppRoutes.GEAR, label: "Gear" },
					{ icon: Settings, href: AppRoutes.SETTINGS, label: "Settings" },
					// { icon: CirclePlus, href: AppRoutes.ADD, label: 'Add' },
				]}
			/>
			<div className="p-0 pl-16 min-h-screen">
				<div className="py-4 px-4 max-w-4xl mx-auto min-w-[480px]">
					{children}
				</div>
				<ToastContainer position="bottom-right" autoClose={3000} />
			</div>
		</div>
	);
};
