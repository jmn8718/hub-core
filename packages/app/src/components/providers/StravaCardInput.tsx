import {
	type ApiClientCredentials,
	Providers,
	StorageKeys,
	type Value,
} from "@repo/types";
import { CheckCircle2, Loader2, RotateCcw, Save, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient, useLoading, useStore } from "../../contexts/index.js";
import { Box } from "../Box.js";
import { H2 } from "../H2.js";
import { SectionContainer } from "../SectionContainer.js";
import { ActionButton } from "./ActionButton.js";
import { InputField } from "./InputField.js";

type ValidationStatus = "pending" | "validating" | "success" | "error";

const provider = Providers.STRAVA;

export function StravaCardInput() {
	const { setLocalLoading, isLocalLoading, setGlobalLoading } = useLoading();
	const { client } = useDataClient();
	const { setValue, getValue } = useStore();
	const [credentials, setCredentials] = useState<ApiClientCredentials>({
		refreshToken: "",
	});
	const [hasChanges, setHasChanges] = useState(false);
	const [validationStatus, setValidationStatus] =
		useState<ValidationStatus>("pending");

	const handleInputChange = (value: string) => {
		setCredentials({ refreshToken: value });
		setHasChanges(true);
	};

	const saveOnStore = async (newCredentials: ApiClientCredentials) => {
		setLocalLoading(true);
		try {
			await setValue(
				StorageKeys.STRAVA_CREDENTIALS,
				newCredentials as unknown as Value,
			);
			setValidationStatus("pending");
			setCredentials(newCredentials);
			await setValue(StorageKeys.STRAVA_VALIDATED, false);
			toast.success("Refresh token stored", {
				transition: Bounce,
			});
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
		setHasChanges(false);
		setTimeout(() => {
			setLocalLoading(false);
		}, 200);
	};

	const handleSave = () => {
		saveOnStore(credentials);
	};

	const handleClear = () => {
		saveOnStore({ refreshToken: "" });
	};

	const validateCredentials = async () => {
		if (hasChanges || !credentials.refreshToken) return;
		setValidationStatus("validating");
		setLocalLoading(true);
		try {
			const result = await client.providerConnect(provider, credentials);
			console.log(result);
			if (result.success) {
				await setValue(StorageKeys.STRAVA_VALIDATED, true);
				setValidationStatus("success");
				toast.success("Validated successfully", {
					transition: Bounce,
				});
			} else {
				throw new Error(result.error);
			}
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
			setValidationStatus("error");
		}
		setTimeout(() => {
			setLocalLoading(false);
		}, 200);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const loadInitialData = async () => {
			try {
				const storedCredentials = await getValue<ApiClientCredentials>(
					StorageKeys.STRAVA_CREDENTIALS,
				);
				if (storedCredentials) {
					setCredentials(storedCredentials);
					const credentialsValidated = await getValue<boolean>(
						StorageKeys.STRAVA_VALIDATED,
					);
					if (credentialsValidated) {
						setValidationStatus("success");
					}
				}
			} catch (error) {
				toast.error((error as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			}
			setTimeout(() => {
				setGlobalLoading(false);
			}, 200);
		};
		setGlobalLoading(true);
		loadInitialData();
	}, []);

	const getValidationButton = () => {
		const canValidate =
			!hasChanges && validationStatus === "pending" && credentials.refreshToken;
		switch (validationStatus) {
			case "validating":
				return (
					<ActionButton
						icon={<Loader2 size={20} className="animate-spin" />}
						tooltip="Validating..."
						disabled
					/>
				);
			case "success":
				return (
					<ActionButton
						icon={<CheckCircle2 size={20} className="text-green-500" />}
						tooltip="Refresh token validated"
					/>
				);
			case "error":
				return (
					<ActionButton
						icon={<XCircle size={20} className="text-red-500" />}
						tooltip="Validation failed - Click to retry"
						disabled={!canValidate}
					/>
				);
			default:
				return (
					<ActionButton
						icon={<CheckCircle2 size={20} className="text-yellow-400" />}
						onClick={validateCredentials}
						tooltip="Validate refresh token"
						disabled={!canValidate}
					/>
				);
		}
	};

	return (
		<Box>
			<SectionContainer hasBorder>
				<div className="flex justify-between items-center mb-4">
					<H2 text={provider} classes="font-bold uppercase" />
					<div className="flex gap-2">
						<ActionButton
							icon={<Save size={20} />}
							onClick={handleSave}
							tooltip="Save refresh token"
							disabled={isLocalLoading || !hasChanges}
						/>
						{getValidationButton()}
						<ActionButton
							icon={<RotateCcw size={20} />}
							onClick={handleClear}
							tooltip="Clear refresh token"
							disabled={isLocalLoading}
						/>
					</div>
				</div>
				<div className="max-w-2xl">
					<InputField
						id="strava-refresh-token"
						label="Refresh Token"
						type="password"
						value={credentials.refreshToken}
						onChange={handleInputChange}
						placeholder="Enter Strava refresh token"
					/>
				</div>
			</SectionContainer>
		</Box>
	);
}
