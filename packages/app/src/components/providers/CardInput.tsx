import type { LoginCredentials, Providers } from "@repo/types";
import { useDataClient } from "../../contexts/index.js";
import { InputField } from "./InputField.js";
import { ProviderCredentialsCard } from "./ProviderCredentialsCard.js";

interface ProviderCardInputProps {
	provider: Providers.COROS | Providers.GARMIN;
}

interface UsernamePasswordCredentials {
	username: string;
	password: string;
}

const isCredentialComplete = (credentials: UsernamePasswordCredentials) =>
	!!credentials.username && !!credentials.password;

export function ProviderCardInput({ provider }: ProviderCardInputProps) {
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
