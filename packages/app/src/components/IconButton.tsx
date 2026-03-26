import { cn } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { useTheme } from "../contexts/ThemeContext.js";

interface IconButtonProps {
	icon: ReactNode;
	label: string;
	onClick: () => void;
	disabled?: boolean;
	className?: string;
}

const IconButton: FC<IconButtonProps> = ({
	icon,
	label,
	onClick,
	disabled = false,
	className = "",
}) => {
	const { colors } = useTheme();

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			className={cn(
				disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
				colors.iconButton,
				"inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
				className,
			)}
			title={label}
		>
			{icon}
			<span className="sr-only">{label}</span>
		</button>
	);
};

export default IconButton;
