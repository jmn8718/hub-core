import { Providers, type StravaCredentials } from "@repo/types";
import { Link2 } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Routes as AppRoutes } from "../../constants.js";
import { useDataClient } from "../../contexts/index.js";
import { Button } from "../Button.js";
import { InputField } from "./InputField.js";
import { ProviderCredentialsCard } from "./ProviderCredentialsCard.js";

const isStravaCredentialsComplete = (credentials: StravaCredentials) =>
	!!credentials.clientId &&
	!!credentials.clientSecret &&
	!!credentials.refreshToken;

export function StravaCardInput() {
	const { client } = useDataClient();
	const navigate = useNavigate();

	const initialCredentials = useMemo<StravaCredentials>(
		() => ({
			clientId: "",
			clientSecret: "",
			refreshToken: "",
			redirectUri: "",
		}),
		[],
	);
	const emptyCredentials = useMemo<StravaCredentials>(
		() => ({
			clientId: "",
			clientSecret: "",
			refreshToken: "",
			redirectUri: "",
		}),
		[],
	);

	const providerConnect = (credentials: StravaCredentials) => {
		return client.providerConnect(
			Providers.STRAVA,
			{ refreshToken: credentials.refreshToken },
			{
				clientId: credentials.clientId,
				clientSecret: credentials.clientSecret,
				redirectUri: credentials.redirectUri,
			},
		);
	};

	return (
		<ProviderCredentialsCard<StravaCredentials>
			provider={Providers.STRAVA}
			initialCredentials={initialCredentials}
			emptyCredentials={emptyCredentials}
			providerConnect={providerConnect}
			isCredentialComplete={isStravaCredentialsComplete}
			labels={{
				saveTooltip: "Save Strava credentials",
				clearTooltip: "Clear Strava credentials",
				validateTooltip: "Validate Strava credentials",
				validateSuccessTooltip: "Strava credentials validated",
				saveToast: () => "Strava credentials stored",
			}}
			renderFields={({ credentials, onChange }) => (
				<>
					<InputField
						id="strava-client-id"
						label="Client ID"
						type="text"
						value={credentials.clientId}
						onChange={(value) => onChange("clientId", value)}
						placeholder="Enter Strava client ID"
					/>
					<InputField
						id="strava-client-secret"
						label="Client Secret"
						type="password"
						value={credentials.clientSecret}
						onChange={(value) => onChange("clientSecret", value)}
						placeholder="Enter Strava client secret"
					/>
					<InputField
						id="strava-redirect-uri"
						label="Redirect URI"
						type="text"
						value={credentials.redirectUri || ""}
						onChange={(value) => onChange("redirectUri", value)}
						placeholder="Enter Strava redirect URI"
					/>
					<InputField
						id="strava-refresh-token"
						label="Refresh Token"
						type="password"
						value={credentials.refreshToken}
						onChange={(value) => onChange("refreshToken", value)}
						placeholder="Enter Strava refresh token"
					/>
					<div className="flex justify-start pt-3">
						<Button
							variant="ghost"
							className="rounded-lg px-3 py-2"
							onClick={() => navigate(AppRoutes.STRAVA)}
						>
							<span className="inline-flex items-center gap-2">
								<Link2 size={16} />
								Manage Webhooks
							</span>
						</Button>
					</div>
				</>
			)}
		/>
	);
}
