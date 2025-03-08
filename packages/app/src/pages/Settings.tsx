import { AppType } from "@repo/types";
import {
  Box,
  SectionContainer,
  FolderPathSection,
  ThemeSection,
  SignOutSection,
} from "../components/index.js";
import { STORE_KEYS } from "../constants.js";
import { useDataClient, useStore } from "../contexts/index.js";

export function Settings() {
  const { store } = useStore();
  const { type } = useDataClient();
  return (
    <Box>
      <SectionContainer title="Theme Settings" hasBorder>
        <ThemeSection />
      </SectionContainer>
      {type === AppType.DESKTOP && (
        <SectionContainer
          title="Downloads"
          hasBorder={!store.obsidian_disabled}
        >
          <FolderPathSection
            id="download-path"
            storeKey={STORE_KEYS.DOWNLOAD_FOLDER}
            text="This is where your downloaded files will be saved"
            popupTitle="Select folder to save downloaded files"
            placeholder="Enter download path"
          />
        </SectionContainer>
      )}
      {type === AppType.DESKTOP && !store.obsidian_disabled && (
        <SectionContainer title="Obsidian">
          <FolderPathSection
            id="obsidian-path"
            storeKey={STORE_KEYS.OBSIDIAN_FOLDER}
            text="Select the Obsidian Vault folder to export the activities"
            popupTitle="Select folder to export obsidian notes"
            placeholder="Enter obsidian vault path"
          />
        </SectionContainer>
      )}
      {type === AppType.WEB && <SignOutSection />}
    </Box>
  );
}
