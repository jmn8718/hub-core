import type { Providers } from "@repo/types";
import { InputField } from "./InputField.js";
import { ProviderCredentialsCard } from "./ProviderCredentialsCard.js";

interface ProviderCardInputProps {
	provider: Providers.COROS | Providers.GARMIN;
}

export function ProviderCardInput({ provider }: ProviderCardInputProps) {
	return (
		<ProviderCredentialsCard
			provider={provider}
			initialCredentials={{ username: "", password: "" }}
			emptyCredentials={{ username: "", password: "" }}
			isCredentialComplete={(credentials) =>
				!!credentials.username && !!credentials.password
			}
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
