import { Search } from "lucide-react";
import type React from "react";
import { useTheme } from "../../contexts/ThemeContext.js";

interface ActivityFiltersProps {
	search: string;
	setSearch: (value: string) => void;
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
	search,
	setSearch,
}) => {
	const { isDarkMode } = useTheme();

	return (
		<div
			className={`${
				isDarkMode ? "bg-gray-800" : "bg-white"
			} p-4 rounded-lg shadow-md flex flex-wrap gap-4`}
		>
			<div className="flex-1 min-w-[200px]">
				<div className="relative">
					<Search
						className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
						size={20}
					/>
					<input
						type="text"
						placeholder="Search activities..."
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
		</div>
	);
};
