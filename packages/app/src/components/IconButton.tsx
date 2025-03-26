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
	const { isDarkMode } = useTheme();

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
				isDarkMode
					? "text-gray-300 hover:text-white hover:bg-gray-700"
					: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
				`
            inline-flex items-center gap-1 px-2 py-1 rounded-md
            text-sm transition-colors duration-200`,
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
