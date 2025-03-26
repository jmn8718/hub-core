import { cn } from "@repo/ui";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext.js";
import { formatDate } from "../../utils/date.js";

interface DatePickerProps {
	date: string | undefined;
	onSave?: (_date: string) => void;
	isEditable?: boolean;
	label: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
	date,
	onSave,
	label,
	isEditable = true,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const { isDarkMode } = useTheme();
	const [dateValue, setDateValue] = useState(date || "");

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDateValue(e.target.value);
	};

	const onBlur = () => {
		setIsEditing(false);
		if (dateValue && onSave) {
			onSave(dateValue);
		}
	};

	return (
		<div className="flex items-center gap-2 text-sm">
			<Calendar
				onClick={() => setIsEditing(!isEditing)}
				size={16}
				className={cn(
					"cursor-pointer",
					isDarkMode ? "text-white" : "text-gray-500",
				)}
			/>
			{isEditable && isEditing ? (
				<input
					type="date"
					placeholder="yyyy/mm/dd"
					value={dateValue}
					onChange={handleChange}
					onBlur={onBlur}
					className={`px-2 py-1 rounded-md ${
						isDarkMode
							? "bg-gray-700 text-white border-gray-600"
							: "bg-white text-gray-900 border-gray-300"
					} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
				/>
			) : (
				// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
				<span
					onClick={() => setIsEditing(isEditable)}
					className={cn(isEditable && "cursor-pointer hover:text-blue-500")}
				>
					{label}: {dateValue ? formatDate(dateValue) : "-"}
				</span>
			)}
		</div>
	);
};
