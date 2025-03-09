import { cn } from "@repo/ui";
import { useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient, useTheme } from "../../contexts/index.js";
import { SectionContainer } from "../SectionContainer.js";

export function SignOutSection() {
	const [isLoading, setIsLoading] = useState(false);
	const { isDarkMode } = useTheme();
	const { client } = useDataClient();

	const onClick = () => {
		setIsLoading(true);
		client
			.signout()
			.catch((err) => {
				console.error(err);
				const message = (err as Error).message;
				toast.error(message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			})
			.finally(() => {
				setIsLoading(false);
			});
	};
	return (
		<SectionContainer title="Sign Out">
			<button
				type="button"
				disabled={isLoading}
				onClick={onClick}
				className={cn(
					`inline-flex items-center px-4 py-3 rounded-lg
                      text-white font-medium text-sm
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                      transition-colors duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      self-center`,
					isDarkMode
						? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
						: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-400",
				)}
			>
				Sign Out
			</button>
		</SectionContainer>
	);
}
