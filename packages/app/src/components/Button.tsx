import { cn } from "@repo/ui";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { useTheme } from "../contexts/ThemeContext.js";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	isActive?: boolean;
	variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
}

export function Button({
	children,
	isActive = false,
	variant,
	className,
	...props
}: PropsWithChildren<ButtonProps>) {
	const { colors } = useTheme();
	const resolvedVariant = isActive ? "primary" : (variant ?? "secondary");
	const variantClasses = {
		primary: colors.buttonPrimary,
		secondary: colors.buttonSecondary,
		success: colors.buttonSuccess,
		danger: colors.buttonDanger,
		ghost: colors.buttonGhost,
	};
	return (
		<button
			type="button"
			className={cn(
				"rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
				variantClasses[resolvedVariant],
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
