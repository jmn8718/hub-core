import { useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient } from "../../contexts/index.js";
import { Button } from "../Button.js";
import { SectionContainer } from "../SectionContainer.js";

export function SignOutSection() {
	const [isLoading, setIsLoading] = useState(false);
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
			<Button disabled={isLoading} onClick={onClick} className="self-start">
				Sign Out
			</Button>
		</SectionContainer>
	);
}
