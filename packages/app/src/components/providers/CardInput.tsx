import type { Providers, Value } from "@repo/types";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient, useLoading } from "../../contexts/index.js";
import { Box } from "../Box.js";
import { H2 } from "../H2.js";
import { ActionButton } from "./ActionButton.js";
import { InputField } from "./InputField.js";

interface ProviderCardInputProps {
	provider: Providers;
}

interface Credentials {
	username: string;
	password: string;
}

export function ProviderCardInput({ provider }: ProviderCardInputProps) {
	const { setLocalLoading, isLocalLoading, setGlobalLoading } = useLoading();
	const { client } = useDataClient();
	const [credentials, setCredentials] = useState<Credentials>({
		username: "",
		password: "",
	});
	const [hasChanges, setHasChanges] = useState(false);

	const handleInputChange = (field: keyof Credentials) => (value: string) => {
		setCredentials((prev) => ({ ...prev, [field]: value }));
		setHasChanges(true);
	};

	const saveOnStore = async (newCredentials: Credentials) => {
		setLocalLoading(true);
		try {
			await client.setStoreValue(
				`${provider}-credentials`,
				newCredentials as unknown as Value,
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
		setCredentials({ username: "", password: "" });
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const loadInitialData = async () => {
			try {
				const storedCredentials = await client.getStoreValue<Credentials>(
					`${provider}-credentials`,
				);
				console.log({ storedCredentials });
				if (storedCredentials) {
					setCredentials(storedCredentials);
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

	return (
		<Box>
			<div className="flex justify-between items-center mb-4">
				<H2 text={provider} classes="font-bold uppercase" />
				<div className="flex gap-2">
					<ActionButton
						icon={<Save size={20} />}
						onClick={handleSave}
						tooltip="Save credentials"
						disabled={isLocalLoading || !hasChanges}
					/>
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
		</Box>
	);
}
