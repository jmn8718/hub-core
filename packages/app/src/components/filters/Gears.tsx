import { cn } from "@repo/ui";
import { Search } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext.js";
import { inputBaseClass } from "../../utils/style.js";

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
	const { colors } = useTheme();
	const inputClass = cn(inputBaseClass, colors.input);

	return (
		<div
			className={cn(
				"flex flex-wrap gap-4 rounded-lg p-4 shadow-md",
				colors.panel,
			)}
		>
			<div className="flex-1 min-w-[200px]">
				<div className="relative">
					<Search
						className={cn(
							"absolute left-3 top-1/2 -translate-y-1/2",
							colors.inputIcon,
						)}
						size={20}
					/>
					<input
						type="text"
						placeholder="Search gear..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className={cn(inputClass, "w-full pl-12 pr-4")}
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
					<span className={colors.text}>Show Retired</span>
				</label>
			</div>
		</div>
	);
};
