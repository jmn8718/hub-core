import { AppType, type ICloudSyncStatus } from "@repo/types";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useState } from "react";
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
	const [hasResolvedInitialStatus, setHasResolvedInitialStatus] =
		useState(false);
	const [status, setStatus] = useState<ICloudSyncStatus>({
		configured: false,
		authenticated: false,
		email: null,
		userId: null,
		lastSyncedAt: null,
		validation: null,
	});

	const formattedLastSyncedAt = status.lastSyncedAt
		? new Intl.DateTimeFormat(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(new Date(status.lastSyncedAt))
		: null;

	const refreshStatus = useCallback(async () => {
		setIsLoading(true);
		try {
			const result = await client.getCloudSyncStatus();
			if (!result.success) {
				throw new Error(result.error);
			}
			setStatus(result.data);
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setIsLoading(false);
			setHasResolvedInitialStatus(true);
		}
	}, [client]);

	useEffect(() => {
		if (type !== AppType.DESKTOP) {
			return;
		}
		void refreshStatus();
	}, [refreshStatus, type]);

	const handleSync = async () => {
		setGlobalLoading(true, "Syncing local data to cloud");
		try {
			const result = await client.syncCloud();
			if (!result.success) {
				throw new Error(result.error);
			}
			await refreshStatus();
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

	if (!isLoading && !status.configured) {
		return null;
	}

	const syncValidation = status.validation;
	const hasSyncMismatch =
		status.authenticated &&
		syncValidation !== null &&
		!syncValidation.compatible;

	const skeletonClassName = cn(
		"animate-pulse rounded-lg",
		isDarkMode ? "bg-gray-700/70" : "bg-gray-200",
	);

	return (
		<SectionContainer title="Cloud Sync">
			<div className="space-y-4">
				{!hasResolvedInitialStatus ? (
					<div className="space-y-4">
						<div className={cn(skeletonClassName, "h-4 w-40")} />
						<div className={cn(skeletonClassName, "h-10 w-56 rounded-full")} />
					</div>
				) : status.authenticated ? (
					<>
						<div className="space-y-1 text-sm">
							<p>Connected as {status.email || "unknown user"}</p>
							{status.userId && (
								<p className="break-all text-muted-foreground">
									User ID: {status.userId}
								</p>
							)}
							<p className="text-muted-foreground">
								Last synced: {formattedLastSyncedAt ?? "Never"}
							</p>
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
					<div className="space-y-3 text-sm text-muted-foreground">
						<p>
							The desktop app no longer provides an in-app cloud login form.
						</p>
						<p>
							Cloud sync remains available only when this desktop already has a
							valid cloud session.
						</p>
					</div>
				)}
			</div>
		</SectionContainer>
	);
}
