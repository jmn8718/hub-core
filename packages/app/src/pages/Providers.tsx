import { Providers } from "@repo/types";
import { ProviderCardInput } from "../components/index.js";

export function ProvidersPage() {
	return (
		<div className="grid grid-cols-1 gap-4">
			<ProviderCardInput provider={Providers.COROS} />
		</div>
	);
}
