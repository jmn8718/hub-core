import { Providers } from "@repo/types";
import { InputField } from "./InputField.js";
import { ProviderCredentialsCard } from "./ProviderCredentialsCard.js";

export function StravaCardInput() {
	return (
		<ProviderCredentialsCard
			provider={Providers.STRAVA}
			initialCredentials={{ refreshToken: "" }}
			emptyCredentials={{ refreshToken: "" }}
			isCredentialComplete={(creds) => !!creds.refreshToken}
			labels={{
				saveTooltip: "Save refresh token",
				clearTooltip: "Clear refresh token",
				validateTooltip: "Validate refresh token",
				validateSuccessTooltip: "Refresh token validated",
				saveToast: () => "Refresh token stored",
			}}
			renderFields={({ credentials, onChange }) => (
				<InputField
					id="strava-refresh-token"
					label="Refresh Token"
					type="password"
					value={credentials.refreshToken}
					onChange={(value) => onChange("refreshToken", value)}
					placeholder="Enter Strava refresh token"
				/>
			)}
		/>
	);
}
