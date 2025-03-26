import { cn } from "@repo/ui";
import { Search } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext.js";

interface GearFiltersProps {
	search: string;
	setSearch: (value: string) => void;
	showRetired: boolean;
	setShowRetired: (show: boolean) => void;
}

export const GearFilters: React.FC<GearFiltersProps> = ({
	search,
	setSearch,
	showRetired,
	setShowRetired,
}) => {
	const { isDarkMode } = useTheme();

	return (
		<div
			className={cn(
				"p-4 rounded-lg shadow-md flex flex-wrap gap-4",
				isDarkMode ? "bg-gray-800" : "bg-white",
			)}
		>
			<div className="flex-1 min-w-[200px]">
				<div className="relative">
					<Search
						className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
						size={20}
					/>
					<input
						type="text"
						placeholder="Search gear..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
							isDarkMode
								? "bg-gray-700 border-gray-600 text-white"
								: "bg-white border-gray-300 text-gray-900"
						} focus:outline-none focus:ring-2 focus:ring-blue-500`}
					/>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<label className="flex items-center gap-2" htmlFor="show-retired">
					<input
						id="show-retired"
						type="checkbox"
						checked={showRetired}
						onChange={(e) => setShowRetired(e.target.checked)}
						className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span className={isDarkMode ? "text-white" : "text-gray-900"}>
						Show Retired
					</span>
				</label>
			</div>
		</div>
	);
};
