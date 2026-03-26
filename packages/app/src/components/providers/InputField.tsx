import { cn } from "@repo/ui";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../../contexts/index.js";
import { formLabelClass, inputBaseClass } from "../../utils/style.js";

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
	const { colors } = useTheme();
	const [showPassword, setShowPassword] = useState(false);
	const isPassword = type === "password";
	return (
		<div className="mb-4">
			<label
				htmlFor={id}
				className={cn("mb-2 block pl-1", formLabelClass, colors.text)}
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
					dir="auto"
					spellCheck={false}
					autoCapitalize="none"
					autoCorrect="off"
					className={cn(inputBaseClass, "w-full pr-10", colors.input)}
				/>
				{isPassword && (
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className={cn(
							"absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 focus:outline-none focus:ring-2 focus:ring-offset-2",
							colors.iconButton,
						)}
						aria-label={showPassword ? "Hide password" : "Show password"}
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
