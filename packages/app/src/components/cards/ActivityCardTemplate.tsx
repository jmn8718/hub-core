import {
	AppType,
	type DbActivityPopulated,
	type IDbGear,
	Providers,
	StorageKeys,
} from "@repo/types";
import { Eye, Medal, Pencil } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Routes as AppRoutes } from "../../constants.js";
import {
	useDataClient,
	useLoading,
	useStore,
	useTheme,
} from "../../contexts/index.js";
import ActivityTypeIcon from "../ActivityTypeIcon.js";
import { Box } from "../Box.js";
import { SectionContainer } from "../SectionContainer.js";
import { EditableText } from "../forms/EditableText.js";
import ObsidianRow from "./ObsidianRow.js";
import ProviderRow from "./ProviderRow.js";

export interface ActivityCardTemplateRenderProps {
	activityData: DbActivityPopulated;
	handleEditActivity: (field: string, value: string) => Promise<void>;
	refreshActivity: () => Promise<void>;
}

interface ActivityCardTemplateProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
	children?: (props: ActivityCardTemplateRenderProps) => ReactNode;
	showDetailsButton?: boolean;
}

export function ActivityCardTemplate({
	activity,
	gears,
	children,
	showDetailsButton = false,
}: ActivityCardTemplateProps) {
	const { isDarkMode } = useTheme();
	const { client, type } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { store } = useStore();
	const [activityData, setActivityData] =
		useState<DbActivityPopulated>(activity);
	const [activityName, setActivityName] = useState(activity.name || "");
	const [activityNotes, setActivityNotes] = useState(activity.notes || "");
	const navigate = useNavigate();

	useEffect(() => {
		setActivityData(activity);
		setActivityName(activity.name || "");
		setActivityNotes(activity.notes || "");
	}, [activity]);

	const refreshActivity = useCallback(async () => {
		const result = await client.getActivity(activity.id);
		if (result.success && result.data) {
			setActivityData(result.data);
			setActivityName(result.data.name || "");
			setActivityNotes(result.data.notes || "");
		} else if (!result.success) {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
	}, [activity.id, client]);

	const handleEditActivity = useCallback(
		async (field: string, value: string) => {
			setLocalLoading(true);
			const result = await client.editActivity(activityData.id, {
				[field]: value,
			});
			if (!result.success) {
				toast.error(result.error, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			}
			await refreshActivity();
			setTimeout(() => {
				setLocalLoading(false);
			}, 200);
		},
		[activityData.id, client, refreshActivity, setLocalLoading],
	);

	const handleNameChange = (newName: string) => {
		setActivityName(newName);
		if (newName !== activityData.name) {
			void handleEditActivity("name", newName);
		}
	};

	const handleNotesChange = (newNotes: string) => {
		setActivityNotes(newNotes);
		if (newNotes !== activityData.notes) {
			void handleEditActivity("notes", newNotes);
		}
	};

	const garminConnection = activityData.connections.find(
		(connection) => connection.provider === Providers.GARMIN,
	);
	const corosConnection = activityData.connections.find(
		(connection) => connection.provider === Providers.COROS,
	);
	const stravaConnection = activityData.connections.find(
		(connection) => connection.provider === Providers.STRAVA,
	);

	const contextValue: ActivityCardTemplateRenderProps = useMemo(
		() => ({
			activityData,
			handleEditActivity,
			refreshActivity,
		}),
		[activityData, handleEditActivity, refreshActivity],
	);

	return (
		<Box>
			<SectionContainer hasBorder>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<ActivityTypeIcon type={activityData.type} />
						{activityData.isEvent === 1 && (
							<Medal size={16} className="text-yellow-500" />
						)}
						<EditableText
							value={activityName}
							onSave={handleNameChange}
							className="text-xl font-semibold h-8"
							placeholder="Enter activity name..."
						/>
					</div>
					<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
						<span className="max-sm:hidden">
							{activityData.manufacturer || "-"}
						</span>
						{showDetailsButton && (
							<button
								type="button"
								className="flex items-center px-3 py-1"
								onClick={(event) => {
									event.stopPropagation();
									navigate(`${AppRoutes.DETAILS}/${activity.id}`);
								}}
							>
								<Eye size={16} />
							</button>
						)}
					</div>
				</div>
			</SectionContainer>

			{children ? children(contextValue) : null}

			<SectionContainer
				hasBorder
				className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
			>
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:space-x-4">
					<ProviderRow
						activityId={activity.id}
						provider={Providers.GARMIN}
						hasConnection={!!garminConnection}
						connectionId={garminConnection?.id}
						isOriginalSource={!!garminConnection?.original}
						hasBeenExported={!!corosConnection}
						refreshData={refreshActivity}
					/>
					<ProviderRow
						activityId={activity.id}
						provider={Providers.COROS}
						hasConnection={!!corosConnection}
						connectionId={corosConnection?.id}
						isOriginalSource={!!corosConnection?.original}
						hasBeenExported={!!garminConnection}
						refreshData={refreshActivity}
					/>
					<ProviderRow
						activityId={activity.id}
						provider={Providers.STRAVA}
						hasConnection={!!stravaConnection}
						connectionId={stravaConnection?.id}
						isOriginalSource={!!stravaConnection?.original}
						hasBeenExported
						refreshData={refreshActivity}
					/>
				</div>
				{type === AppType.DESKTOP &&
					store[StorageKeys.OBSIDIAN_FOLDER] &&
					!store[StorageKeys.OBSIDIAN_DISABLED] && (
						<ObsidianRow data={activityData} gears={gears} />
					)}
			</SectionContainer>
			<SectionContainer>
				<div className="flex items-center gap-2">
					<Pencil size={16} className="text-gray-500" />
					<span
						className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Notes
					</span>
				</div>
				<EditableText
					value={activityNotes}
					onSave={handleNotesChange}
					className="w-full"
					placeholder="Enter activity notes..."
					useTextArea
				/>
			</SectionContainer>
		</Box>
	);
}
