import { useEffect, useState } from "react";
import { Box } from "../components/index.js";
import { useDataClient } from "../contexts/index.js";

type BuildInfo = {
	appVersion: string;
	clientVersion: string;
	commit: string;
};

const getBuildInfo = (): BuildInfo => {
	const source = (
		globalThis as {
			__HUB_BUILD_INFO__?: Partial<BuildInfo>;
		}
	).__HUB_BUILD_INFO__;

	return {
		appVersion: source?.appVersion || "unknown",
		clientVersion: source?.clientVersion || "unknown",
		commit: source?.commit || "unknown",
	};
};

export function Debug() {
	const { type, client } = useDataClient();
	const [debugInfo, setDebugInfo] = useState<string[]>([]);
	const buildInfo = getBuildInfo();

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
			<Box>
				<p>App version: {buildInfo.appVersion}</p>
				<p>Client version: {buildInfo.clientVersion}</p>
				<p>Commit: {buildInfo.commit}</p>
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
