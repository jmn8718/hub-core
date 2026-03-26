import { cn } from "@repo/ui";
import { useTheme } from "../../contexts/ThemeContext.js";
import { Text } from "../Text.js";

export function ThemeSection() {
	const { isDarkMode, toggleDarkMode, colors } = useTheme();
	return (
		<div className="flex items-center justify-between">
			<Text text="Dark Mode" className="text-md" />
			<label
				htmlFor="toggle-dark"
				className="relative inline-flex min-h-11 min-w-[52px] items-center justify-end cursor-pointer"
				aria-label="Toggle dark mode"
			>
				<input
					id="toggle-dark"
					type="checkbox"
					className="sr-only peer"
					checked={isDarkMode}
					onChange={toggleDarkMode}
				/>
				<div
					className={cn(
						"relative h-7 w-12 rounded-full transition-colors peer-focus:outline-none peer-focus:ring-4 peer-checked:after:translate-x-5 after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:transition-transform after:content-['']",
						colors.toggleTrack,
						colors.toggleThumb,
					)}
				/>
			</label>
		</div>
	);
}
