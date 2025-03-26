import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext.js";

interface EditableNumberProps {
	value: number;
	onSave: (value: number) => void;
	formatValue?: (value: number) => string;
	className?: string;
	placeholder?: string;
	min?: number;
	step?: number;
}

export const EditableNumber: React.FC<EditableNumberProps> = ({
	value,
	onSave,
	className = "",
	placeholder = "Enter number...",
	min = 0,
	step = 1,
	formatValue,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedValue, setEditedValue] = useState(value.toString());
	const inputRef = useRef<HTMLInputElement>(null);
	const { isDarkMode } = useTheme();

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isEditing]);

	const handleClick = () => {
		setIsEditing(true);
	};

	const handleBlur = () => {
		setIsEditing(false);
		const numValue = Number.parseFloat(editedValue);
		if (!Number.isNaN(numValue) && numValue !== value && numValue >= min) {
			onSave(numValue);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			setIsEditing(false);
			const numValue = Number.parseFloat(editedValue);
			if (!Number.isNaN(numValue) && numValue >= min) {
				onSave(numValue);
			}
		} else if (e.key === "Escape") {
			setIsEditing(false);
			setEditedValue(value.toString());
		}
	};

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				type="number"
				value={editedValue}
				onChange={(e) => setEditedValue(e.target.value)}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				min={min}
				step={step}
				className={`w-full max-w-[400px] px-2 py-1 rounded-md ${
					isDarkMode
						? "bg-gray-700 text-white border-gray-600"
						: "bg-white text-gray-900 border-gray-300"
				} border focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
				placeholder={placeholder}
			/>
		);
	}
	const formattedValue =
		formatValue && value !== undefined
			? formatValue(value)
			: (value ?? placeholder);
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			onClick={handleClick}
			className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1 -mx-2 ${className}`}
		>
			{formattedValue}
		</div>
	);
};
