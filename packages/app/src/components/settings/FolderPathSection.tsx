import type { StorageKeys } from "@repo/types";
import { cn } from "@repo/ui";
import { Folder } from "lucide-react";
import type React from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient, useStore, useTheme } from "../../contexts/index.js";
import { Text } from "../Text.js";

export function FolderPathSection({
	id,
	storeKey,
	text,
	placeholder,
	popupTitle,
}: {
	id: string;
	storeKey: StorageKeys.OBSIDIAN_FOLDER | StorageKeys.DOWNLOAD_FOLDER;
	text: string;
	placeholder: string;
	popupTitle: string;
}) {
	const { isDarkMode } = useTheme();
	const { store, setValue } = useStore();
	const { client } = useDataClient();

	const saveNewPath = (newPath: string) => {
		setValue(storeKey, newPath);
	};

	const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newFolderPath = e.target.value;
		if (newFolderPath) {
			saveNewPath(newFolderPath);
		}
	};

	const onClick = async () => {
		const currentValue = (store[storeKey] as string) || "";
		const result = await client.getFolder(currentValue, popupTitle);
		if (result.success) {
			if (result.data && result.data !== currentValue) {
				saveNewPath(result.data);
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
			<Text text={text} />
			<div className="relative">
				<button
					type="button"
					className="z-20 rounded-lg absolute h-full w-full cursor-pointer"
					onClick={onClick}
				/>
				<Folder
					size={20}
					className={cn(
						"absolute z-10 left-3 top-1/2 transform -translate-y-1/2",
						isDarkMode ? "text-gray-300" : "text-gray-700",
					)}
				/>
				<input
					id={id}
					value={(store[storeKey] as string) || ""}
					onChange={handlePathChange}
					className={cn(
						"w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500",
						isDarkMode
							? "bg-gray-700 border-gray-600 text-white focus:border-blue-500"
							: "bg-white border-gray-300 text-gray-900 focus:border-blue-500",
					)}
					placeholder={placeholder}
				/>
			</div>
		</div>
	);
}
