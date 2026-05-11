import { AppType, type ICloudSyncStatus } from "@repo/types";
import { cn } from "@repo/ui";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useTheme } from "../../contexts/ThemeContext.js";
import { useDataClient, useLoading } from "../../contexts/index.js";
import { Button } from "../Button.js";
import { SectionContainer } from "../SectionContainer.js";

export function CloudSyncSection() {
	const { client, type } = useDataClient();
	const { isDarkMode } = useTheme();
	const { setGlobalLoading } = useLoading();
	const [isLoading, setIsLoading] = useState(true);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState<ICloudSyncStatus>({
		configured: false,
		authenticated: false,
		email: null,
		userId: null,
		validation: null,
	});

	const refreshStatus = useCallback(async () => {
		setIsLoading(true);
		try {
			const result = await client.getCloudSyncStatus();
			if (!result.success) {
				throw new Error(result.error);
			}
			setStatus(result.data);
			setEmail(result.data.email ?? "");
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setIsLoading(false);
		}
	}, [client]);

	useEffect(() => {
		if (type !== AppType.DESKTOP) {
			return;
		}
		void refreshStatus();
	}, [refreshStatus, type]);

	const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		try {
			const result = await client.signInCloud(email, password);
			if (!result.success) {
				throw new Error(result.error);
			}
			setPassword("");
			await refreshStatus();
			toast.success("Cloud sync login complete.", {
				transition: Bounce,
			});
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
			setIsLoading(false);
		}
	};

	const handleSync = async () => {
		setGlobalLoading(true, "Syncing local data to cloud");
		try {
			const result = await client.syncCloud();
			if (!result.success) {
				throw new Error(result.error);
			}
			toast.success(
				`${result.data.syncMode === "delta" ? "Delta" : "Baseline"} sync pushed ${result.data.pushedRows} rows across ${result.data.pushedTables} tables and pulled ${result.data.pulledRows} rows across ${result.data.pulledTables} tables.`,
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
		} finally {
			setGlobalLoading(false);
		}
	};

	const handleSignOut = async () => {
		setIsLoading(true);
		try {
			await client.signout();
			setPassword("");
			await refreshStatus();
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
			setIsLoading(false);
		}
	};

	if (type !== AppType.DESKTOP) {
		return null;
	}

	if (!isLoading && !status.configured) {
		return null;
	}

	const syncValidation = status.validation;
	const hasSyncMismatch =
		status.authenticated &&
		syncValidation !== null &&
		!syncValidation.compatible;

	const inputClassName = cn(
		"w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
		isDarkMode
			? "border-gray-600 bg-gray-700 text-white focus:border-blue-500"
			: "border-gray-300 bg-white text-gray-900 focus:border-blue-500",
	);

	return (
		<SectionContainer title="Cloud Sync">
			<div className="space-y-4">
				{status.authenticated ? (
					<>
						<div className="space-y-1 text-sm">
							<p>Connected as {status.email || "unknown user"}</p>
							{status.userId && (
								<p className="break-all text-muted-foreground">
									User ID: {status.userId}
								</p>
							)}
						</div>
						{hasSyncMismatch && (
							<div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
								<p className="font-medium">
									Desktop app and server sync conditions do not match.
								</p>
								<ul className="mt-2 list-disc pl-5">
									{syncValidation.reasons.map((reason) => (
										<li key={reason}>{reason}</li>
									))}
								</ul>
							</div>
						)}
						<div className="flex flex-wrap gap-3">
							<Button
								disabled={isLoading || hasSyncMismatch}
								onClick={handleSync}
								variant="primary"
							>
								Sync local data to cloud
							</Button>
							<Button disabled={isLoading} onClick={handleSignOut}>
								Sign out
							</Button>
						</div>
					</>
				) : (
					<form className="space-y-3" onSubmit={handleSignIn}>
						<p className="text-sm text-muted-foreground">
							Sign in with your Supabase account to push local app data to the
							cloud database.
						</p>
						<label className="flex flex-col gap-2">
							<span className="text-sm text-gray-500 dark:text-gray-400">
								Email
							</span>
							<input
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								placeholder="name@example.com"
								className={inputClassName}
								autoComplete="email"
							/>
						</label>
						<label className="flex flex-col gap-2">
							<span className="text-sm text-gray-500 dark:text-gray-400">
								Password
							</span>
							<input
								type="password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								placeholder="Your password"
								className={inputClassName}
								autoComplete="current-password"
							/>
						</label>
						<Button
							type="submit"
							disabled={isLoading || !email.trim() || !password}
							variant="primary"
							className="self-start"
						>
							Sign in to cloud sync
						</Button>
					</form>
				)}
			</div>
		</SectionContainer>
	);
}
