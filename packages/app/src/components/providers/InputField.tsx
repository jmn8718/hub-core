import { cn } from "@repo/ui";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../../contexts/index.js";

interface InputFieldProps {
	id: string;
	label: string;
	type: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
	id,
	label,
	type,
	value,
	onChange,
	placeholder,
}) => {
	const { isDarkMode } = useTheme();
	const [showPassword, setShowPassword] = useState(false);
	const isPassword = type === "password";
	return (
		<div className="mb-4">
			<label
				htmlFor={id}
				className={cn(
					"pl-1 mb-2 block text-sm font-medium",
					isDarkMode ? "text-white" : "text-gray-800",
				)}
			>
				{label}
			</label>
			<div className="relative">
				<input
					id={id}
					// eslint-disable-next-line no-nested-ternary
					type={isPassword ? (showPassword ? "text" : "password") : type}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className={cn(
						"w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500",
						isDarkMode
							? "bg-gray-700 border-gray-600 text-white focus:border-blue-500"
							: "bg-white border-gray-300 text-gray-900 focus:border-blue-500",
					)}
				/>
				{isPassword && (
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
					>
						{showPassword ? (
							<EyeOff size={20} className="stroke-current" />
						) : (
							<Eye size={20} className="stroke-current" />
						)}
					</button>
				)}
			</div>
		</div>
	);
};
