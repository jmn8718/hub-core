import { ActivitySubType, ActivityType } from "@repo/types";
import { cn } from "@repo/ui";
import { Search } from "lucide-react";
import type React from "react";
import { useTheme } from "../../contexts/ThemeContext.js";

interface ActivityFiltersProps {
	search: string;
	setSearch: (value: string) => void;
	type: ActivityType | "ALL";
	setType: (value: ActivityType | "ALL") => void;
	subtype: ActivitySubType | "";
	setSubtype: (value: ActivitySubType | "") => void;
	startDate: string;
	endDate: string;
	setStartDate: (value: string) => void;
	setEndDate: (value: string) => void;
	isRace: boolean | "ALL";
	setIsRace: (value: boolean | "ALL") => void;
	onApplyFilters: () => void;
}

const inputBase =
	"rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const typeOptions: (ActivityType | "ALL")[] = [
	"ALL",
	...Object.values(ActivityType),
];
const subtypeOptions: (ActivitySubType | "")[] = [
	"",
	...Object.values(ActivitySubType),
];

const SelectFilter = ({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	options: string[];
}) => {
	const { isDarkMode } = useTheme();

	const inputClasses = isDarkMode
		? `${inputBase} bg-gray-700 border-gray-600 text-white`
		: `${inputBase} bg-white border-gray-300 text-gray-900`;

	return (
		<div className="flex flex-col gap-2">
			{/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
			<label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
				{label}
			</label>
			<select value={value} onChange={onChange} className={inputClasses}>
				{options.map((opt) => (
					<option key={opt} value={opt}>
						{opt || "ALL"}
					</option>
				))}
			</select>
		</div>
	);
};

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
	search,
	setSearch,
	type,
	setType,
	subtype,
	setSubtype,
	startDate,
	endDate,
	setStartDate,
	setEndDate,
	isRace,
	setIsRace,
	onApplyFilters,
}) => {
	const { isDarkMode } = useTheme();

	const inputClasses = isDarkMode
		? `${inputBase} bg-gray-700 border-gray-600 text-white`
		: `${inputBase} bg-white border-gray-300 text-gray-900`;

	return (
		<div
			className={cn(
				"flex flex-col p-4 rounded-lg shadow-md flex-wrap gap-4",
				isDarkMode ? "bg-gray-800" : "bg-white",
			)}
		>
			<div className="flex-1 min-w-[240px]">
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
						className={`w-full pl-10 pr-4 ${inputClasses}`}
					/>
				</div>
			</div>
			<div className="hidden md:flex flex-row items-center justify-between gap-4 w-full md:items-end md:flex-wrap">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="flex flex-col gap-2 md:flex-row md:gap-4">
						<SelectFilter
							label="Type"
							value={type}
							onChange={(e) => setType(e.target.value as ActivityType | "ALL")}
							options={typeOptions.map((value) => value)}
						/>
						<SelectFilter
							label="Race"
							value={isRace === "ALL" ? "ALL" : isRace ? "YES" : "NO"}
							onChange={(e) => {
								const value = e.target.value;
								setIsRace(value === "ALL" ? "ALL" : value === "YES");
							}}
							options={["ALL", "YES", "NO"]}
						/>
						<SelectFilter
							label="Subtype"
							value={subtype}
							onChange={(e) =>
								setSubtype(e.target.value as ActivitySubType | "")
							}
							options={subtypeOptions.map((value) => value || "NONE")}
						/>
					</div>
					<div className="flex flex-col gap-2 md:flex-row md:gap-4">
						<div className="flex flex-col gap-2">
							{/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
							<label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
								Start Date
							</label>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className={inputClasses}
							/>
						</div>
						<div className="flex flex-col gap-2">
							{/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
							<label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
								End Date
							</label>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className={inputClasses}
							/>
						</div>
					</div>
				</div>
				<button
					type="button"
					onClick={onApplyFilters}
					className={`px-4 py-2 rounded-lg text-sm font-medium ${
						isDarkMode
							? "bg-blue-600 text-white hover:bg-blue-700"
							: "bg-blue-500 text-white hover:bg-blue-600"
					}`}
				>
					Apply
				</button>
			</div>
		</div>
	);
};
