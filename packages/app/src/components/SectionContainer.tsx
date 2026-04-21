import { cn } from "@repo/ui";
import type React from "react";
import { H2 } from "./H2.js";

interface SectionContainerProps {
	children: React.ReactNode;
	hasBorder?: boolean;
	title?: string;
	className?: string;
}

export const SectionContainer: React.FC<SectionContainerProps> = ({
	hasBorder = false,
	title,
	children,
	className,
}) => {
	return (
		<div
			className={cn(
				"space-y-3 pb-2 sm:space-y-4 sm:pb-4",
				hasBorder ? "mb-2 border-b sm:mb-4" : "pb-0",
				className,
			)}
		>
			{title && <H2 text={title} />}
			{children}
		</div>
	);
};
