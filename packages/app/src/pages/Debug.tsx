import {
	type ActivityRegenerationSummary,
	AppType,
	StorageKeys,
	type Value,
} from "@repo/types";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { Box, Button } from "../components/index.js";
import { useDataClient, useLoading } from "../contexts/index.js";

type BuildInfo = {
	appVersion: string;
	clientVersion: string;
	commit: string;
};

const getBuildInfo = (): BuildInfo => {
	const source = (
		globalThis as {
			__HUB_BUILD_INFO__?: Partial<BuildInfo>;
		}
	).__HUB_BUILD_INFO__;

	return {
		appVersion: source?.appVersion || "unknown",
		clientVersion: source?.clientVersion || "unknown",
		commit: source?.commit || "unknown",
	};
};

export function Debug() {
	const { type, client } = useDataClient();
	const { setGlobalLoading } = useLoading();
	const [debugInfo, setDebugInfo] = useState<string[]>([]);
	const [windowSize, setWindowSize] = useState<string>("unknown");
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [isRegeneratingActivities, setIsRegeneratingActivities] =
		useState(false);
	const [regenerationSummary, setRegenerationSummary] =
		useState<ActivityRegenerationSummary | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const buildInfo = getBuildInfo();
	const storeKeys = Object.values(StorageKeys);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const info = client.getDebugInfo();
		if (info.success) {
			setDebugInfo(info.data);
		}
		if (typeof window !== "undefined") {
			setWindowSize(`${window.innerWidth}x${window.innerHeight}`);
		}
	}, []);

	const handleExportStorage = async () => {
		setIsExporting(true);
		try {
			const entries = await Promise.all(
				storeKeys.map(
					async (key) => [key, await client.getStoreValue(key)] as const,
				),
			);
			const values = Object.fromEntries(
				entries.filter(([, value]) => typeof value !== "undefined"),
			);
			const payload = JSON.stringify(
				{
					exportedAt: new Date().toISOString(),
					values,
				},
				null,
				2,
			);
			const blob = new Blob([payload], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "hub-core-storage.json";
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				transition: Bounce,
			});
		} finally {
			setIsExporting(false);
		}
	};

	const handleImportStorage = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setIsImporting(true);
		try {
			const text = await file.text();
			const parsed = JSON.parse(text) as
				| Partial<Record<StorageKeys, Value>>
				| {
						values?: Partial<Record<StorageKeys, Value>>;
				  };
			const values =
				"values" in parsed && parsed.values ? parsed.values : parsed;
			const validEntries = Object.entries(values).filter(
				([key, value]) =>
					storeKeys.includes(key as StorageKeys) &&
					typeof value !== "undefined",
			) as [StorageKeys, Value][];

			for (const [key, value] of validEntries) {
				await client.setStoreValue(key, value);
			}

			toast.success(`Imported ${validEntries.length} storage values`, {
				transition: Bounce,
			});
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				transition: Bounce,
			});
		} finally {
			event.target.value = "";
			setIsImporting(false);
		}
	};

	const handleRegenerateActivitiesData = async () => {
		setIsRegeneratingActivities(true);
		setGlobalLoading(true, "Regenerating activity data");
		try {
			const result = await client.regenerateActivitiesData();
			if (!result.success) {
				throw new Error(result.error);
			}
			setRegenerationSummary(result.data);
			toast.success(
				`Regenerated activity data for ${result.data.regenerated} activities`,
				{
					transition: Bounce,
				},
			);
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				transition: Bounce,
			});
		} finally {
			setGlobalLoading(false);
			setIsRegeneratingActivities(false);
		}
	};

	return (
		<div className="grid grid-cols-1 gap-4">
			<Box>
				<span>App Type: {type}</span>
			</Box>
			<Box>
				<p>App version: {buildInfo.appVersion}</p>
				<p>Client version: {buildInfo.clientVersion}</p>
				<p>Commit: {buildInfo.commit}</p>
				<p>Window size: {windowSize}</p>
			</Box>
			{type === AppType.DESKTOP && (
				<Box>
					<div className="flex flex-wrap gap-3">
						<Button onClick={handleExportStorage} disabled={isExporting}>
							{isExporting ? "Exporting..." : "Export storage"}
						</Button>
						<Button
							onClick={() => fileInputRef.current?.click()}
							disabled={isImporting}
						>
							{isImporting ? "Importing..." : "Import storage"}
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/json"
							className="hidden"
							onChange={handleImportStorage}
						/>
					</div>
				</Box>
			)}
			{type === AppType.DESKTOP && (
				<Box>
					<div className="space-y-3">
						<div className="space-y-1">
							<p className="font-medium">
								Regenerate provider-derived activity data
							</p>
							<p className="text-sm text-muted-foreground">
								Recomputes metadata and activity time for existing running and
								cycling activities from their original provider only. It uses
								cached provider details when available and fetches from that
								same provider only when needed.
							</p>
						</div>
						<Button
							onClick={handleRegenerateActivitiesData}
							disabled={isRegeneratingActivities}
						>
							{isRegeneratingActivities
								? "Regenerating..."
								: "Regenerate activity data"}
						</Button>
						{regenerationSummary && (
							<div className="space-y-1 text-sm">
								<p>Total activities: {regenerationSummary.total}</p>
								<p>Eligible: {regenerationSummary.eligible}</p>
								<p>Regenerated: {regenerationSummary.regenerated}</p>
								<p>Skipped: {regenerationSummary.skipped}</p>
								<p>Failed: {regenerationSummary.failed}</p>
								{regenerationSummary.failures.length > 0 && (
									<div className="space-y-1 pt-2">
										<p className="font-medium">Failures</p>
										{regenerationSummary.failures.map((failure) => (
											<p
												key={`${failure.activityId}-${failure.providerActivityId ?? failure.provider ?? failure.error}`}
												className="break-all"
											>
												{failure.activityId}
												{failure.provider ? ` | ${failure.provider}` : ""}
												{failure.providerActivityId
													? ` | ${failure.providerActivityId}`
													: ""}
												{` | ${failure.error}`}
											</p>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				</Box>
			)}
			{debugInfo.length > 0 && (
				<Box>
					{debugInfo.map((value) => (
						<p key={value}>{value}</p>
					))}
				</Box>
			)}
		</div>
	);
}
