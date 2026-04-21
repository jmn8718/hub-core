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
import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bounce, ToastContainer, toast } from "react-toastify";
import { Routes as AppRoutes } from "../constants.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { Sidebar } from "./Sidebar.js";

const OFFLINE_CACHE_HIT_EVENT = "hub-core:offline-cache-hit";
const OFFLINE_CACHE_MISS_EVENT = "hub-core:offline-cache-miss";
const OFFLINE_CACHE_HIT_TOAST_ID = "hub-core-offline-cache-hit";
const OFFLINE_CACHE_MISS_TOAST_ID = "hub-core-offline-cache-miss";

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	const { isDarkMode } = useTheme();
	const { type } = useDataClient();
	const location = useLocation();
	const isCalendarRoute = location.pathname === AppRoutes.CALENDAR;
	const [isWebSidebarOpen, setIsWebSidebarOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useLayoutEffect(() => {
		if (typeof window !== "undefined") {
			window.scrollTo(0, 0);
		}
	}, [location.pathname]);

	useEffect(() => {
		const handleOfflineCacheHit = () => {
			toast.info("Showing saved data because this device is offline.", {
				toastId: OFFLINE_CACHE_HIT_TOAST_ID,
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		};

		const handleOfflineCacheMiss = (event: Event) => {
			const message =
				event instanceof CustomEvent &&
				typeof event.detail?.message === "string"
					? event.detail.message
					: "You are offline and no saved data is available for this view.";

			toast.error(message, {
				toastId: OFFLINE_CACHE_MISS_TOAST_ID,
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});

			window.setTimeout(() => {
				toast.clearWaitingQueue();
			}, 0);
		};

		window.addEventListener(OFFLINE_CACHE_HIT_EVENT, handleOfflineCacheHit);
		window.addEventListener(OFFLINE_CACHE_MISS_EVENT, handleOfflineCacheMiss);

		return () => {
			window.removeEventListener(
				OFFLINE_CACHE_HIT_EVENT,
				handleOfflineCacheHit,
			);
			window.removeEventListener(
				OFFLINE_CACHE_MISS_EVENT,
				handleOfflineCacheMiss,
			);
		};
	}, []);

	return (
		<div
			className={cn(
				"min-h-screen transition-colors duration-200",
				isDarkMode ? "bg-gray-900" : "bg-gray-100",
			)}
		>
			<Sidebar
				isOpen={isWebSidebarOpen}
				onOpenChange={setIsWebSidebarOpen}
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
					type === AppType.DESKTOP ? "pl-16" : "pl-0",
				)}
			>
				<div
					className={cn(
						"min-h-screen flex flex-col p-3 pt-16 md:p-4",
						isCalendarRoute ? "mx-0 max-w-none" : "mx-auto max-w-4xl",
					)}
				>
					{children}
				</div>
				<ToastContainer position="bottom-right" autoClose={3000} limit={1} />
			</div>
		</div>
	);
};
