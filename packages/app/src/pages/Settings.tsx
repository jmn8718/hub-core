import { AppType, StorageKeys } from "@repo/types";
import { Link } from "react-router-dom";
import {
	Box,
	FolderPathSection,
	SectionContainer,
	SignOutSection,
	ThemeSection,
} from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient, useStore } from "../contexts/index.js";

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
							text="This is where your downloaded files will be saved"
							popupTitle="Select folder to save downloaded files"
							placeholder="Enter download path"
						/>
					</SectionContainer>
				)}
				{type === AppType.DESKTOP && !store[StorageKeys.OBSIDIAN_DISABLED] && (
					<SectionContainer title="Obsidian">
						<FolderPathSection
							id="obsidian-path"
							storeKey={StorageKeys.OBSIDIAN_FOLDER}
							text="Select the Obsidian Vault folder to export the activities"
							popupTitle="Select folder to export obsidian notes"
							placeholder="Enter obsidian vault path"
						/>
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
