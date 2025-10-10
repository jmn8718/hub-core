import { Loader as Spinner } from "lucide-react";

export default function Loader() {
	return (
		<div className="flex items-center justify-center">
			Loading
			<Spinner className="mr-3 size-5 animate-spin" color="orange" />
		</div>
	);
}
