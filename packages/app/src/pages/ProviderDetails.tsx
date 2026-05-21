import { Providers } from "@repo/types";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
	ProviderActivitySyncSection,
	ProviderCardInput,
	ProviderSyncActionsSection,
	StravaCardInput,
	StravaWebhooksSection,
} from "../components/index.js";
import { Routes } from "../constants.js";
import { parseProviderSlug } from "../utils/providers.js";

export function ProviderDetailsPage() {
	const { provider: providerParam } = useParams();
	const provider = parseProviderSlug(providerParam);
	if (!provider) {
		return (
			<div className="space-y-4">
				<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<div className="text-2xl font-bold text-gray-900">
						Unknown Provider
					</div>
					<p className="mt-2 text-sm text-gray-600">
						The selected provider is not supported.
					</p>
					<Link
						to={Routes.PROVIDERS}
						className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					>
						<ArrowLeft size={16} />
						Back to providers
					</Link>
				</div>
			</div>
		);
	}

	return <ProviderDetailsContent provider={provider} />;
}

function ProviderDetailsContent({ provider }: { provider: Providers }) {
	const [stateVersion, setStateVersion] = useState(0);
	const handleStateChange = () => {
		setStateVersion((value) => value + 1);
	};

	return (
		<div className="space-y-4">
			{provider === Providers.STRAVA ? (
				<StravaCardInput
					cardTitle="Credentials"
					showTitle={false}
					formSectionHasBorder={false}
					showSyncActionsSection={false}
					showActivitySyncAction={false}
					onStateChange={handleStateChange}
				/>
			) : (
				<ProviderCardInput
					provider={provider}
					cardTitle="Credentials"
					showTitle={false}
					formSectionHasBorder={false}
					showSyncActionsSection={false}
					showActivitySyncAction={false}
					onStateChange={handleStateChange}
				/>
			)}
			<ProviderSyncActionsSection
				provider={provider}
				stateVersion={stateVersion}
			/>
			<ProviderActivitySyncSection provider={provider} />
			{provider === Providers.STRAVA ? <StravaWebhooksSection /> : null}
		</div>
	);
}
