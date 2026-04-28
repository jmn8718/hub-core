import { formatDate } from "@repo/dates";
import { cn } from "@repo/ui";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext.js";

interface DatePickerProps {
	date: string | undefined;
	onSave?: (_date: string) => void;
	isEditable?: boolean;
	label: string;
	className?: string;
	inputClassName?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
	date,
	onSave,
	label,
	isEditable = true,
	className,
	inputClassName,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const { isDarkMode } = useTheme();
	const [dateValue, setDateValue] = useState(date || "");

	useEffect(() => {
		if (!isEditing) {
			setDateValue(date || "");
		}
	}, [date, isEditing]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDateValue(e.target.value);
	};

	const onBlur = () => {
		setIsEditing(false);
		if (dateValue && onSave) {
			onSave(dateValue);
		}
	};

	const openEditor = () => {
		if (isEditable) {
			setIsEditing(true);
		}
	};

	return (
		<div className={cn("flex items-center gap-3 text-sm", className)}>
			<button
				type="button"
				onClick={openEditor}
				disabled={!isEditable}
				aria-label={`Edit ${label}`}
				className={cn(
					"flex size-6 shrink-0 items-center justify-center rounded",
					isEditable && "cursor-pointer",
					isDarkMode
						? "text-white hover:bg-gray-700"
						: "text-gray-500 hover:bg-gray-100",
				)}
			>
				<Calendar size={16} />
			</button>
			{isEditable && isEditing ? (
				<input
					type="date"
					aria-label={label}
					placeholder="yyyy/mm/dd"
					value={dateValue}
					onChange={handleChange}
					onBlur={onBlur}
					className={cn(
						"px-2 py-1 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500",
						isDarkMode
							? "bg-gray-700 text-white border-gray-600"
							: "bg-white text-gray-900 border-gray-300",
						inputClassName,
					)}
				/>
			) : (
				<button
					type="button"
					onClick={openEditor}
					disabled={!isEditable}
					className={cn(
						"text-left",
						isEditable && "cursor-pointer hover:text-blue-500",
					)}
				>
					{label}: {dateValue ? formatDate(dateValue) : "-"}
				</button>
			)}
		</div>
	);
};
