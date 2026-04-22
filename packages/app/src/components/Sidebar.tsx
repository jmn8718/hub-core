import { AppType } from "@repo/types";
import { cn } from "@repo/ui";
import type { LucideProps } from "lucide-react";
import type React from "react";
import { Link, useLocation } from "react-router-dom";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";

type SidebarItem = {
	icon: React.ForwardRefExoticComponent<
		Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
	>;
	href: string;
	label: string;
	hideOnWeb?: boolean;
};

export function Sidebar({
	sidebarItems,
	isOpen = false,
	onOpenChange,
}: {
	sidebarItems: SidebarItem[];
	isOpen?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
}) {
	const { colors } = useTheme();
	const { type } = useDataClient();
	const location = useLocation();
	const isWeb = type === AppType.WEB;
	const isExpanded = !isWeb || isOpen;

	return (
		<aside
			className={cn(
				"fixed left-0 top-14 z-40 shadow-lg flex flex-col transition-transform duration-200 ease-out",
				colors.navSurface,
				isWeb
					? "h-[calc(100dvh-3.5rem)] w-56 px-3 py-3 min-[420px]:py-4"
					: "h-[calc(100vh-3.5rem)] w-16 items-center py-6",
				isWeb && !isExpanded && "-translate-x-full",
			)}
		>
			<nav
				className={cn(
					"flex flex-col",
					isWeb
						? "min-h-0 flex-1 gap-1 pr-1 min-[420px]:gap-2"
						: "items-center gap-4",
				)}
			>
				{sidebarItems.map(({ icon: Icon, href, label, hideOnWeb }) => {
					const isActive = location.pathname === href;
					return (
						<Link
							key={href}
							to={href}
							onClick={() => {
								if (isWeb) {
									onOpenChange?.(false);
								}
							}}
							className={cn(
								"relative group flex items-center rounded-lg",
								colors.navHover,
								isWeb
									? "min-h-10 gap-3 px-3 text-sm font-medium min-[420px]:min-h-11"
									: "h-12 w-12 justify-center",
								isWeb && hideOnWeb && "hidden",
								isActive && colors.navActive,
							)}
							aria-label={label}
							title={label}
						>
							<Icon
								size={24}
								className={cn(
									"size-6 shrink-0",
									isActive ? "text-current" : colors.navIcon,
								)}
							/>
							{isWeb ? <span className="truncate">{label}</span> : null}
							{!isWeb ? (
								<span
									className={cn(
										"pointer-events-none absolute left-full z-50 ml-2 rounded px-2 py-1 text-sm whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100",
										colors.tooltip,
									)}
								>
									{label}
								</span>
							) : null}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
