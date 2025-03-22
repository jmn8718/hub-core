import { Box } from "../components/index.js";
import { useDataClient } from "../contexts/index.js";

export function Debug() {
	const { type } = useDataClient();
	return (
		<Box>
			<span>App Type: {type}</span>
		</Box>
	);
}
