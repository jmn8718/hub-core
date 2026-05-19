import { AppType, Providers } from "@repo/types";
import {
	HomeProvidersSection,
	ProviderCardInput,
	StravaCardInput,
} from "../components/index.js";
import { useDataClient } from "../contexts/index.js";

export function ProvidersPage() {
	const { type } = useDataClient();
	return (
		<div className="space-y-4">
			{type === AppType.WEB ? <HomeProvidersSection /> : null}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ProviderCardInput provider={Providers.COROS} />
				<ProviderCardInput provider={Providers.GARMIN} />
				<StravaCardInput />
			</div>
		</div>
	);
}
