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
	Menu,
	PanelLeftClose,
	PlusSquare,
	Settings,
} from "lucide-react";
import type React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bounce, ToastContainer, toast } from "react-toastify";
import { Routes as AppRoutes } from "../constants.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { Sidebar } from "./Sidebar.js";

const OFFLINE_CACHE_HIT_EVENT = "hub-core:offline-cache-hit";
const OFFLINE_CACHE_MISS_EVENT = "hub-core:offline-cache-miss";
const OFFLINE_CACHE_HIT_TOAST_ID = "hub-core-offline-cache-hit";
const OFFLINE_CACHE_MISS_TOAST_ID = "hub-core-offline-cache-miss";
const headerIconActionClass =
	"absolute grid size-10 place-items-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";

const getPageTitle = (pathname: string) => {
	if (pathname === AppRoutes.HOME) return "Home";
	if (pathname === AppRoutes.DATA) return "Data";
	if (pathname === AppRoutes.CALENDAR) return "Calendar";
	if (pathname === AppRoutes.ADD) return "Add Activity";
	if (pathname === AppRoutes.INBODY) return "Inbody";
	if (pathname === AppRoutes.INBODY_ADD) return "Add Inbody Entry";
	if (pathname === AppRoutes.INBODY_HISTORY) return "Inbody History";
	if (pathname.startsWith("/inbody/") && pathname.endsWith("/edit")) {
		return "Edit Inbody Entry";
	}
	if (pathname === AppRoutes.ANALYTICS) return "Analytics";
	if (pathname === AppRoutes.PROVIDERS) return "Providers";
	if (pathname.startsWith("/providers/")) return "Provider Sync";
	if (pathname === AppRoutes.GEAR) return "Gear";
	if (pathname === AppRoutes.GEAR_ADD) return "Add Gear";
	if (pathname.startsWith(`${AppRoutes.GEAR}/`)) return "Gear Details";
	if (pathname === AppRoutes.SETTINGS) return "Settings";
	if (pathname === AppRoutes.DEBUG) return "Debug";
	if (pathname.startsWith(`${AppRoutes.DETAILS}/`)) {
		return "Activity Details";
	}

	return "Hub Core";
};

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	const { colors, isDarkMode } = useTheme();
	const { type } = useDataClient();
	const location = useLocation();
	const isCalendarRoute = location.pathname === AppRoutes.CALENDAR;
	const isWeb = type === AppType.WEB;
	const pageTitle = getPageTitle(location.pathname);
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
			<header
				className={cn(
					"fixed inset-x-0 top-0 z-50 h-14 border-b shadow-sm",
					isDarkMode
						? "border-slate-700 bg-slate-900 text-slate-100"
						: "border-slate-200 bg-white text-slate-900",
				)}
			>
				<div className="relative flex h-full items-center justify-center px-16">
					{isWeb ? (
						<button
							type="button"
							aria-label={
								isWebSidebarOpen ? "Collapse navigation" : "Open navigation"
							}
							aria-expanded={isWebSidebarOpen}
							onClick={() => setIsWebSidebarOpen((current) => !current)}
							className={cn(headerIconActionClass, "left-3", colors.navHover)}
						>
							{isWebSidebarOpen ? (
								<PanelLeftClose className={cn("size-5", colors.navIcon)} />
							) : (
								<Menu className={cn("size-5", colors.navIcon)} />
							)}
						</button>
					) : null}
					<h1 className="min-w-0 truncate text-center text-base font-semibold tracking-normal">
						{pageTitle}
					</h1>
					<Link
						to={AppRoutes.SETTINGS}
						aria-label="Settings"
						title="Settings"
						className={cn(headerIconActionClass, "right-3", colors.navHover)}
					>
						<Settings className={cn("size-5", colors.navIcon)} />
					</Link>
				</div>
			</header>
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
				]}
			/>
			<div
				className={cn("p-0 pt-14", type === AppType.DESKTOP ? "pl-16" : "pl-0")}
			>
				<div
					className={cn(
						"box-border min-h-[calc(100dvh-3.5rem)] flex flex-col",
						"p-3 md:p-4",
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
