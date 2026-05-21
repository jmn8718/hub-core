import { AppType, Providers } from "@repo/types";
import {
	HomeProvidersSection,
	ProviderSummaryCard,
} from "../components/index.js";
import { useDataClient } from "../contexts/index.js";
import { getProviderRoute } from "../utils/providers.js";

export function ProvidersPage() {
	const { type } = useDataClient();
	return (
		<div className="space-y-4">
			{type === AppType.WEB ? <HomeProvidersSection /> : null}
			<div className="flex flex-col items-center gap-4">
				<ProviderSummaryCard
					provider={Providers.COROS}
					href={getProviderRoute(Providers.COROS)}
					classes="w-full md:w-[calc(50%-0.5rem)]"
				/>
				<ProviderSummaryCard
					provider={Providers.GARMIN}
					href={getProviderRoute(Providers.GARMIN)}
					classes="w-full md:w-[calc(50%-0.5rem)]"
				/>
				<ProviderSummaryCard
					provider={Providers.STRAVA}
					href={getProviderRoute(Providers.STRAVA)}
					classes="w-full md:w-[calc(50%-0.5rem)]"
				/>
			</div>
		</div>
	);
}
