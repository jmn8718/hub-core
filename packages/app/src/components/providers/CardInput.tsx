import {
	type Credentials,
	type Providers,
	StorageKeys,
	type Value,
} from "@repo/types";
import {
	CheckCircle2,
	FolderSync,
	Loader2,
	RefreshCw,
	RotateCcw,
	Save,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient, useLoading, useStore } from "../../contexts/index.js";
import { Box } from "../Box.js";
import { H2 } from "../H2.js";
import { SectionContainer } from "../SectionContainer.js";
import { ActionButton } from "./ActionButton.js";
import { InputField } from "./InputField.js";

interface ProviderCardInputProps {
	provider: Providers;
}

type ValidationStatus = "pending" | "validating" | "success" | "error";

export function ProviderCardInput({ provider }: ProviderCardInputProps) {
	const { setLocalLoading, isLocalLoading, setGlobalLoading } = useLoading();
	const { client } = useDataClient();
	const { setValue, getValue } = useStore();
	const [credentials, setCredentials] = useState<Credentials>({
		username: "",
		password: "",
	});
	const [hasChanges, setHasChanges] = useState(false);
	const [validationStatus, setValidationStatus] =
		useState<ValidationStatus>("pending");

	const handleInputChange = (field: keyof Credentials) => (value: string) => {
		setCredentials((prev) => ({ ...prev, [field]: value }));
		setHasChanges(true);
	};

	const saveOnStore = async (newCredentials: Credentials) => {
		setLocalLoading(true);
		try {
			await setValue(
				StorageKeys[`${provider}_CREDENTIALS`],
				newCredentials as unknown as Value,
			);
			setValidationStatus("pending");
			setCredentials(newCredentials);
			await setValue(StorageKeys[`${provider}_VALIDATED`], false);
			toast.success(
				`Credentials ${newCredentials.username ? "stored" : "cleared"}`,
				{
					transition: Bounce,
				},
			);
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
		saveOnStore({ username: "", password: "" });
	};

	const validateCredentials = async () => {
		if (hasChanges || !credentials.username || !credentials.password) return;
		setValidationStatus("validating");
		setLocalLoading(true);
		try {
			const result = await client.providerConnect(provider, credentials);
			if (result.success) {
				await setValue(StorageKeys[`${provider}_VALIDATED`], true);
				setValidationStatus("success");
				toast.success("Validated successfully", {
					transition: Bounce,
				});
				await setValue(StorageKeys[`${provider}_VALIDATED`], true);
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
				const storedCredentials = await getValue<Credentials>(
					StorageKeys[`${provider}_CREDENTIALS`],
				);
				if (storedCredentials) {
					setCredentials(storedCredentials);
					const credentialsValidated = await getValue<boolean>(
						StorageKeys[`${provider}_VALIDATED`],
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

	const handlePullGear = async () => {
		if (validationStatus !== "success") return;
		setLocalLoading(true);

		try {
			const result = await client.providerSyncGear(provider);
			if (result.success) {
				toast.success("Gear synced", { transition: Bounce });
			} else {
				throw new Error(result.error);
			}
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}

		setTimeout(() => {
			setLocalLoading(false);
		}, 200);
	};

	const handleSync = async () => {
		if (validationStatus !== "success") return;
		setLocalLoading(true);

		try {
			const result = await client.providerSync(provider);
			if (result.success) {
				toast.success("Activities synced", { transition: Bounce });
				setValue(
					StorageKeys[`${provider}_LAST_SYNC`],
					new Date().toISOString(),
				);
			} else {
				throw new Error(result.error);
			}
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}

		setTimeout(() => {
			setLocalLoading(false);
		}, 200);
	};

	const getValidationButton = () => {
		const canValidate =
			!hasChanges &&
			validationStatus === "pending" &&
			credentials.username &&
			credentials.password;
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
						tooltip="Credentials validated"
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
						tooltip="Validate credentials"
						disabled={!canValidate}
					/>
				);
		}
	};

	const disabledAction = isLocalLoading || validationStatus !== "success";
	return (
		<Box>
			<SectionContainer hasBorder>
				<div className="flex justify-between items-center mb-4">
					<H2 text={provider} classes="font-bold uppercase" />
					<div className="flex gap-2">
						<ActionButton
							icon={<Save size={20} />}
							onClick={handleSave}
							tooltip="Save credentials"
							disabled={isLocalLoading || !hasChanges}
						/>
						{getValidationButton()}
						<ActionButton
							icon={<RotateCcw size={20} />}
							onClick={handleClear}
							tooltip="Clear credentials"
							disabled={isLocalLoading}
						/>
					</div>
				</div>
				<div className="max-w-2xl">
					<InputField
						id={`${provider}-username`}
						label="Username"
						type="text"
						value={credentials.username}
						onChange={handleInputChange("username")}
						placeholder="Enter username"
					/>
					<InputField
						id={`${provider}-password`}
						label="Password"
						type="password"
						value={credentials.password}
						onChange={handleInputChange("password")}
						placeholder="Enter password"
					/>
				</div>
			</SectionContainer>
			<SectionContainer>
				<div className="flex gap-4 items-center">
					<ActionButton
						icon={<FolderSync size={20} />}
						onClick={handlePullGear}
						text="Sync Gears"
						disabled={disabledAction}
					/>
					<ActionButton
						icon={<RefreshCw size={20} />}
						onClick={handleSync}
						text="Sync Activities"
						disabled={disabledAction}
					/>
				</div>
			</SectionContainer>
		</Box>
	);
}
