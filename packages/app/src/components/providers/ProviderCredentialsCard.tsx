import type { Client } from "@repo/clients";
import {
	type ApiCredentials,
	type LoginCredentials,
	ProviderSuccessResponse,
	type Providers,
	StorageKeys,
	type StravaCredentials,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient, useLoading, useStore } from "../../contexts/index.js";
import { Box } from "../Box.js";
import { H2 } from "../H2.js";
import { SectionContainer } from "../SectionContainer.js";
import { ActionButton } from "./ActionButton.js";
import {
	type ValidationStatus,
	useProviderSyncActions,
} from "./useProviderSyncActions.js";

type CredentialRecord = LoginCredentials | StravaCredentials;

interface RenderFieldsProps<T> {
	credentials: T;
	onChange: <K extends keyof T>(field: K, value: string) => void;
}

interface ProviderCredentialsCardProps<T> {
	provider: Providers;
	initialCredentials: T;
	emptyCredentials: T;
	providerConnect: (
		credentials: T,
	) => ReturnType<typeof Client.prototype.providerConnect>;
	renderFields: (props: RenderFieldsProps<T>) => React.ReactNode;
	isCredentialComplete: (credentials: T) => boolean;
	labels: {
		saveTooltip: string;
		clearTooltip: string;
		validateTooltip: string;
		validateSuccessTooltip: string;
		saveToast: (credentials: T) => string;
	};
}

const VALIDATION_ERROR_TOOLTIP = "Validation failed - Click to retry";
const VALIDATION_LOADING_TOOLTIP = "Validating...";

const storageKeyFor = (
	provider: Providers,
	suffix: "CREDENTIALS" | "VALIDATED" | "LAST_SYNC",
): StorageKeys => {
	return StorageKeys[
		`${provider}_${suffix}` as keyof typeof StorageKeys
	] as StorageKeys;
};

export function ProviderCredentialsCard<T extends CredentialRecord>({
	provider,
	initialCredentials,
	emptyCredentials,
	renderFields,
	isCredentialComplete,
	labels,
	providerConnect,
}: ProviderCredentialsCardProps<T>) {
	const { setLocalLoading, isLocalLoading } = useLoading();
	const { client } = useDataClient();
	const { setValue, getValue } = useStore();
	const initialCredentialsRef = useRef(initialCredentials);
	const emptyCredentialsRef = useRef(emptyCredentials);
	const [credentials, setCredentials] = useState<T>(
		initialCredentialsRef.current,
	);
	const [hasChanges, setHasChanges] = useState(false);
	const [validationStatus, setValidationStatus] =
		useState<ValidationStatus>("pending");

	const credentialsKey = useMemo(
		() => storageKeyFor(provider, "CREDENTIALS"),
		[provider],
	);
	const validatedKey = useMemo(
		() => storageKeyFor(provider, "VALIDATED"),
		[provider],
	);

	const { handlePullGear, handleSync } = useProviderSyncActions({
		provider,
		validationStatus,
		client,
		setLocalLoading,
		setValue,
	});

	const handleInputChange = useCallback((field: keyof T, value: string) => {
		setCredentials((prev) => ({ ...prev, [field]: value }));
		setHasChanges(true);
	}, []);

	const saveOnStore = useCallback(
		async (newCredentials: T) => {
			setLocalLoading(true);
			try {
				await setValue(credentialsKey, newCredentials as unknown as Value);
				setValidationStatus("pending");
				setCredentials(newCredentials);
				await setValue(validatedKey, false);
				toast.success(labels.saveToast(newCredentials), {
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
		},
		[credentialsKey, labels, setLocalLoading, setValue, validatedKey],
	);

	const handleSave = useCallback(() => {
		saveOnStore(credentials);
	}, [credentials, saveOnStore]);

	const handleClear = useCallback(() => {
		saveOnStore(emptyCredentialsRef.current);
	}, [saveOnStore]);

	const validateCredentials = useCallback(async () => {
		if (hasChanges || !isCredentialComplete(credentials)) return;
		setValidationStatus("validating");
		setLocalLoading(true);
		try {
			const result = await providerConnect(credentials);
			if (result.success) {
				await setValue(validatedKey, true);
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
	}, [
		credentials,
		hasChanges,
		isCredentialComplete,
		providerConnect,
		setLocalLoading,
		setValue,
		validatedKey,
	]);

	useEffect(() => {
		const loadInitialData = async () => {
			try {
				const storedCredentials = await getValue<T>(credentialsKey);
				if (storedCredentials) {
					const mergedCredentials = {
						...initialCredentialsRef.current,
						...storedCredentials,
					};
					setCredentials(mergedCredentials);
					const credentialsValidated = await getValue<boolean>(validatedKey);
					if (credentialsValidated && isCredentialComplete(mergedCredentials)) {
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
		};
		loadInitialData();
	}, [credentialsKey, getValue, isCredentialComplete, validatedKey]);

	const getValidationButton = () => {
		const canValidate =
			!hasChanges &&
			validationStatus === "pending" &&
			isCredentialComplete(credentials);
		switch (validationStatus) {
			case "validating":
				return (
					<ActionButton
						icon={<Loader2 size={20} className="animate-spin" />}
						tooltip={VALIDATION_LOADING_TOOLTIP}
						disabled
					/>
				);
			case "success":
				return (
					<ActionButton
						icon={<CheckCircle2 size={20} className="text-green-500" />}
						tooltip={labels.validateSuccessTooltip}
					/>
				);
			case "error":
				return (
					<ActionButton
						icon={<XCircle size={20} className="text-red-500" />}
						tooltip={VALIDATION_ERROR_TOOLTIP}
						disabled={!canValidate}
					/>
				);
			default:
				return (
					<ActionButton
						icon={<CheckCircle2 size={20} className="text-yellow-400" />}
						onClick={validateCredentials}
						tooltip={labels.validateTooltip}
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
							tooltip={labels.saveTooltip}
							disabled={isLocalLoading || !hasChanges}
						/>
						{getValidationButton()}
						<ActionButton
							icon={<RotateCcw size={20} />}
							onClick={handleClear}
							tooltip={labels.clearTooltip}
							disabled={isLocalLoading}
						/>
					</div>
				</div>
				<div className="max-w-2xl">
					{renderFields({
						credentials,
						onChange: handleInputChange,
					})}
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
