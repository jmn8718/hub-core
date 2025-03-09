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
				"space-y-4 pb-4",
				hasBorder ? "mb-4 border-b" : "pb-0",
				className,
			)}
		>
			{title && <H2 text={title} />}
			{children}
		</div>
	);
};
