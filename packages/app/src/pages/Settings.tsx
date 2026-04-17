import { AppType, StorageKeys } from "@repo/types";
import { cn } from "@repo/ui";
import type React from "react";
import { Link } from "react-router-dom";
import {
	Box,
	FolderPathSection,
	SectionContainer,
	SignOutSection,
	ThemeSection,
} from "../components/index.js";
import { Routes } from "../constants.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { useDataClient, useStore } from "../contexts/index.js";

function StoreTextField({
	storeKey,
	label,
	placeholder,
	type = "text",
}: {
	storeKey: StorageKeys.DEFAULT_CITY | StorageKeys.DEFAULT_COUNTRY;
	label: string;
	placeholder: string;
	type?: "text" | "password";
}) {
	const { store, setValue } = useStore();
	const { isDarkMode } = useTheme();

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		void setValue(storeKey, event.target.value);
	};

	return (
		<label className="flex flex-col gap-2">
			<span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
			<input
				type={type}
				value={(store[storeKey] as string) || ""}
				onChange={handleChange}
				placeholder={placeholder}
				className={cn(
					"w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
					isDarkMode
						? "border-gray-600 bg-gray-700 text-white focus:border-blue-500"
						: "border-gray-300 bg-white text-gray-900 focus:border-blue-500",
				)}
			/>
		</label>
	);
}

export function Settings() {
	const { store } = useStore();
	const { type } = useDataClient();
	return (
		<div className="flex flex-col justify-between flex-1">
			<Box>
				<SectionContainer title="Theme Settings" hasBorder>
					<ThemeSection />
				</SectionContainer>
				{type === AppType.DESKTOP && (
					<SectionContainer
						title="Downloads"
						hasBorder={!store[StorageKeys.OBSIDIAN_DISABLED]}
					>
						<FolderPathSection
							id="download-path"
							storeKey={StorageKeys.DOWNLOAD_FOLDER}
							text="Choose where downloaded activity files should be saved."
							popupTitle="Choose a folder for downloaded activity files"
							placeholder="Choose a download folder"
						/>
					</SectionContainer>
				)}
				{type === AppType.DESKTOP && (
					<SectionContainer title="Cache" hasBorder>
						<FolderPathSection
							id="cache-path"
							storeKey={StorageKeys.CACHE_FOLDER}
							text="Optional. Save provider activity data as JSON files for debugging."
							popupTitle="Choose a folder for cached activity data"
							placeholder="Choose a cache folder"
						/>
					</SectionContainer>
				)}
				{type === AppType.DESKTOP && !store[StorageKeys.OBSIDIAN_DISABLED] && (
					<SectionContainer title="Obsidian">
						<FolderPathSection
							id="obsidian-path"
							storeKey={StorageKeys.OBSIDIAN_FOLDER}
							text="Choose the Obsidian vault where activity notes should be exported."
							popupTitle="Choose an Obsidian vault folder"
							placeholder="Choose an Obsidian vault"
						/>
						<div className="mt-4 grid gap-3 md:grid-cols-2">
							<StoreTextField
								storeKey={StorageKeys.DEFAULT_CITY}
								label="Default city"
								placeholder="Used when an activity has no city"
							/>
							<StoreTextField
								storeKey={StorageKeys.DEFAULT_COUNTRY}
								label="Default country"
								placeholder="Used when an activity has no country"
							/>
						</div>
					</SectionContainer>
				)}
				{type === AppType.WEB && <SignOutSection />}
			</Box>
			<div className="flex flex-row-reverse">
				<Link
					to={Routes.DEBUG}
					className="text-md italic text-muted-foreground"
				>
					Debug
				</Link>
			</div>
		</div>
	);
}
