import { Providers } from "@repo/types";
import { ProviderCardInput, StravaCardInput } from "../components/index.js";

export function ProvidersPage() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<ProviderCardInput provider={Providers.COROS} />
			<ProviderCardInput provider={Providers.GARMIN} />
			<StravaCardInput />
		</div>
	);
}
