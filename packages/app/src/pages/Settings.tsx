import { AppType } from "@repo/types";
import {
  Box,
  Container,
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
    <Container>
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
              placeholder="Enter obsidian vault path"
            />
          </SectionContainer>
        )}
        {type === AppType.WEB && <SignOutSection />}
      </Box>
    </Container>
  );
}
