import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Routes } from "../constants.js";
import { getProviderRoute, parseProviderSlug } from "../utils/providers.js";

export function ProviderActivitySyncPage() {
	const { provider: providerParam } = useParams();
	const provider = useMemo(
		() => parseProviderSlug(providerParam),
		[providerParam],
	);

	return (
		<Navigate
			to={provider ? getProviderRoute(provider) : Routes.PROVIDERS}
			replace
		/>
	);
}
