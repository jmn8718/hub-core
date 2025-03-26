import { useEffect, useState } from "react";
import { Box } from "../components/index.js";
import { useDataClient } from "../contexts/index.js";

export function Debug() {
	const { type, client } = useDataClient();
	const [debugInfo, setDebugInfo] = useState<string[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const info = client.getDebugInfo();
		if (info.success) {
			setDebugInfo(info.data);
		}
	}, []);
	return (
		<div className="grid grid-cols-1 gap-4">
			<Box>
				<span>App Type: {type}</span>
			</Box>
			{debugInfo.length > 0 && (
				<Box>
					{debugInfo.map((value) => (
						<p key={value}>{value}</p>
					))}
				</Box>
			)}
		</div>
	);
}
