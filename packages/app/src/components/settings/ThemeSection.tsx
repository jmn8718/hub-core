import { cn } from "@repo/ui";
import { useTheme } from "../../contexts/ThemeContext.js";
import { Text } from "../Text.js";

export function ThemeSection() {
	const { isDarkMode, toggleDarkMode } = useTheme();
	return (
		<div className="flex items-center justify-between">
			<Text text="Dark Mode" className="text-md" />
			<label
				htmlFor="toggle-dark"
				className="relative inline-flex items-center cursor-pointer"
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
						"w-11 h-6 bg-gray-200 rounded-full",
						"peer-focus:outline-none peer-focus:ring-4 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600",
						isDarkMode
							? "border-gray-600 peer-focus:ring-blue-800"
							: "peer-focus:ring-blue-300",
					)}
				/>
			</label>
		</div>
	);
}
