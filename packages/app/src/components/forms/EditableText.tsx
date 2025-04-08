import { cn } from "@repo/ui";
import { type FC, useEffect, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext.js";

interface EditableTextProps {
	value: string;
	onSave: (value: string) => void;
	formatText?: (value: string) => string;
	className?: string;
	placeholder?: string;
	useTextArea?: boolean;
}

export const EditableText: FC<EditableTextProps> = ({
	value,
	onSave,
	formatText,
	className = "",
	placeholder = "",
	useTextArea = false,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedValue, setEditedValue] = useState(value);
	const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
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
		if (editedValue !== value) {
			onSave(editedValue);
		}
	};

	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
	) => {
		if (e.key === "Enter" && !useTextArea) {
			setIsEditing(false);
			onSave(editedValue);
		} else if (e.key === "Escape") {
			setIsEditing(false);
			setEditedValue(value);
		}
	};
	if (isEditing) {
		const Component = useTextArea ? "textarea" : "input";
		return (
			<Component
				ref={inputRef}
				type="text"
				value={editedValue}
				onChange={(e) => setEditedValue(e.target.value)}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				className={cn(
					"w-full px-2 py-1 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500",
					isDarkMode
						? "bg-gray-700 text-white border-gray-600"
						: "bg-white text-gray-900 border-gray-300",
					className,
				)}
				placeholder={placeholder}
			/>
		);
	}

	const displayValue = value || placeholder;
	const formattedValue = formatText ? formatText(displayValue) : displayValue;
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			onClick={handleClick}
			className={cn(
				"cursor-pointer rounded flex items-center px-2 py-1",
				isDarkMode
					? "hover:bg-gray-700 text-white"
					: "hover:bg-gray-100 text-gray-900",
				className,
			)}
		>
			{useTextArea ? (
				<div className="flex flex-col">
					{formattedValue.split("\n").map((line, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<span key={index}>{line}</span>
					))}
				</div>
			) : (
				<span>{formattedValue}</span>
			)}
		</div>
	);
};
