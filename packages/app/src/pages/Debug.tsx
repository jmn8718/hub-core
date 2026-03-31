import { AppType, StorageKeys, type Value } from "@repo/types";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { Box, Button } from "../components/index.js";
import { useDataClient } from "../contexts/index.js";

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
	const [debugInfo, setDebugInfo] = useState<string[]>([]);
	const [windowSize, setWindowSize] = useState<string>("unknown");
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
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
