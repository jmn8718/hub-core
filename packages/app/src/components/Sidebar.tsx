import { AppType } from "@repo/types";
import { cn } from "@repo/ui";
import { type LucideProps, Menu, PanelLeftClose } from "lucide-react";
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
		<>
			{isWeb ? (
				<button
					type="button"
					aria-label={isOpen ? "Collapse navigation" : "Open navigation"}
					aria-expanded={isOpen}
					onClick={() => onOpenChange?.(!isOpen)}
					className={cn(
						"fixed left-3 top-3 z-50 grid size-10 place-items-center rounded-lg border shadow-sm transition-colors min-[420px]:size-11",
						colors.navSurface,
						colors.navHover,
					)}
				>
					{isOpen ? (
						<PanelLeftClose className={cn("size-5", colors.navIcon)} />
					) : (
						<Menu className={cn("size-5", colors.navIcon)} />
					)}
				</button>
			) : null}

			<aside
				className={cn(
					"fixed left-0 top-0 z-40 shadow-lg flex flex-col transition-transform duration-200 ease-out",
					colors.navSurface,
					isWeb
						? "h-[100dvh] w-56 px-3 pb-3 pt-16 min-[420px]:pt-20"
						: "h-full w-16 items-center py-6",
					isWeb && !isExpanded && "-translate-x-full",
				)}
			>
				<nav
					className={cn(
						"flex flex-col",
						isWeb
							? "min-h-0 flex-1 gap-1 overflow-y-auto overscroll-contain pr-1 min-[420px]:gap-2"
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
		</>
	);
}
