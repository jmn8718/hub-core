import type { LoginCredentials, Providers } from "@repo/types";
import { useDataClient } from "../../contexts/index.js";
import { InputField } from "./InputField.js";
import { ProviderCredentialsCard } from "./ProviderCredentialsCard.js";

interface ProviderCardInputProps {
	provider: Providers.COROS | Providers.GARMIN;
	titleHref?: string;
	cardTitle?: string;
	showTitle?: boolean;
	formSectionHasBorder?: boolean;
	showSyncActionsSection?: boolean;
	showActivitySyncAction?: boolean;
	onStateChange?: () => void;
}

interface UsernamePasswordCredentials {
	username: string;
	password: string;
}

const isCredentialComplete = (credentials: UsernamePasswordCredentials) =>
	!!credentials.username && !!credentials.password;

export function ProviderCardInput({
	provider,
	titleHref,
	cardTitle,
	showTitle,
	formSectionHasBorder,
	showSyncActionsSection,
	showActivitySyncAction,
	onStateChange,
}: ProviderCardInputProps) {
	const { client } = useDataClient();

	const providerConnect = (credentials: LoginCredentials) => {
		return client.providerConnect(provider, credentials);
	};
	return (
		<ProviderCredentialsCard
			provider={provider}
			initialCredentials={{ username: "", password: "" }}
			emptyCredentials={{ username: "", password: "" }}
			providerConnect={providerConnect}
			isCredentialComplete={isCredentialComplete}
			labels={{
				saveTooltip: "Save credentials",
				clearTooltip: "Clear credentials",
				validateTooltip: "Validate credentials",
				validateSuccessTooltip: "Credentials validated",
				saveToast: (credentials) =>
					`Credentials ${credentials.username ? "stored" : "cleared"}`,
			}}
			cardTitle={cardTitle}
			titleHref={titleHref}
			showTitle={showTitle}
			formSectionHasBorder={formSectionHasBorder}
			showSyncActionsSection={showSyncActionsSection}
			showActivitySyncAction={showActivitySyncAction}
			onStateChange={onStateChange}
			renderFields={({ credentials, onChange }) => (
				<>
					<InputField
						id={`${provider}-username`}
						label="Username"
						type="text"
						value={credentials.username}
						onChange={(value) => onChange("username", value)}
						placeholder="Enter username"
					/>
					<InputField
						id={`${provider}-password`}
						label="Password"
						type="password"
						value={credentials.password}
						onChange={(value) => onChange("password", value)}
						placeholder="Enter password"
					/>
				</>
			)}
		/>
	);
}
