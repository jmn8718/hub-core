import { cn } from "@repo/ui";
import { useTheme } from "../../contexts/ThemeContext.js";

interface ActionButtonProps {
	icon: React.ReactNode;
	onClick?: () => void;
	tooltip?: string;
	text?: string;
	disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
	icon,
	onClick,
	tooltip = "",
	text = "",
	disabled = false,
}) => {
	const { isDarkMode } = useTheme();

	return (
		<div className="relative group">
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={cn(
					"p-2 rounded-lg transition-colors duration-200 flex gap-2 items-center",
					disabled
						? "opacity-50 cursor-not-allowed"
						: isDarkMode
							? "hover:bg-gray-700 text-gray-300 hover:text-white"
							: "hover:bg-gray-100 text-gray-600 hover:text-gray-900",
				)}
				aria-label={tooltip}
			>
				{icon}

				{text && <span>{text}</span>}
			</button>
			{tooltip && (
				<span
					className={cn(
						"absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded pointer-events-none transition-opacity duration-200 whitespace-nowrap",
						isDarkMode ? "bg-gray-700 text-white" : "bg-gray-800 text-white",
						disabled ? "opacity-0" : "opacity-0 group-hover:opacity-100",
					)}
				>
					{tooltip}
				</span>
			)}
		</div>
	);
};
