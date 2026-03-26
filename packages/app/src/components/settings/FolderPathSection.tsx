import type { StorageKeys } from "@repo/types";
import { cn } from "@repo/ui";
import { Folder } from "lucide-react";
import type React from "react";
import { useEffect, useId, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient, useStore, useTheme } from "../../contexts/index.js";
import { Button } from "../Button.js";
import { Text } from "../Text.js";

export function FolderPathSection({
	id,
	storeKey,
	text,
	placeholder,
	popupTitle,
}: {
	id: string;
	storeKey:
		| StorageKeys.OBSIDIAN_FOLDER
		| StorageKeys.DOWNLOAD_FOLDER
		| StorageKeys.CACHE_FOLDER;
	text: string;
	placeholder: string;
	popupTitle: string;
}) {
	const { colors } = useTheme();
	const { store, setValue } = useStore();
	const { client } = useDataClient();
	const [draftValue, setDraftValue] = useState("");
	const descriptionId = useId();

	useEffect(() => {
		setDraftValue(((store[storeKey] as string) || "").toString());
	}, [store, storeKey]);

	const saveNewPath = async (newPath: string) => {
		await setValue(storeKey, newPath);
	};

	const handlePathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setDraftValue(event.target.value);
	};

	const handlePathCommit = async () => {
		const currentValue = ((store[storeKey] as string) || "").toString();
		const nextValue = draftValue.trim();
		if (nextValue !== currentValue) {
			await saveNewPath(nextValue);
			toast.success("Folder updated.", { transition: Bounce });
		}
	};

	const onClick = async () => {
		const currentValue = ((store[storeKey] as string) || "").toString();
		const result = await client.getFolder(currentValue, popupTitle);
		if (result.success) {
			if (result.data && result.data !== currentValue) {
				setDraftValue(result.data);
				await saveNewPath(result.data);
				toast.success("Folder updated.", { transition: Bounce });
			}
		} else {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
	};

	return (
		<div className="flex flex-col space-y-2">
			<Text text={text} className="max-w-prose" />
			<div className="flex flex-col gap-2 md:flex-row">
				<div className="relative flex-1 min-w-0">
					<label htmlFor={id} className="sr-only">
						{popupTitle}
					</label>
					<Folder
						size={20}
						className={cn(
							"absolute left-3 top-1/2 -translate-y-1/2",
							colors.inputIcon,
						)}
					/>
					<input
						id={id}
						aria-describedby={descriptionId}
						value={draftValue}
						onChange={handlePathChange}
						onBlur={() => void handlePathCommit()}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								void handlePathCommit();
							}
						}}
						className={cn(
							"w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2",
							colors.input,
						)}
						placeholder={placeholder}
					/>
				</div>
				<Button onClick={onClick} className="shrink-0">
					Browse
				</Button>
			</div>
			<p id={descriptionId} className={cn("text-xs", colors.description)}>
				You can paste a path or choose a folder.
			</p>
		</div>
	);
}
