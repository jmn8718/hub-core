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
	const { colors } = useTheme();

	return (
		<div className="relative group">
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				title={tooltip || text}
				className={cn(
					"flex items-center gap-2 rounded-lg p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
					disabled ? "opacity-50 cursor-not-allowed" : colors.iconButton,
				)}
				aria-label={tooltip || text}
			>
				{icon}
				{text && <span>{text}</span>}
			</button>
			{tooltip && (
				<span
					className={cn(
						"pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs transition-opacity duration-200",
						colors.tooltip,
						disabled
							? "opacity-0"
							: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
					)}
				>
					{tooltip}
				</span>
			)}
		</div>
	);
};
