import {
	type ActivityMetadata,
	ActivityType,
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
import { formatPace, formatSpeed } from "../../utils/formatters.js";
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
	showExtendedTextFields?: boolean;
	onActivityRefresh?: () => Promise<void> | void;
}

function getPerformanceMetrics(
	type: ActivityType,
	metadata?: ActivityMetadata,
): Array<{ label: string; value: string }> {
	if (!metadata) return [];
	const metrics = metadata as Record<string, unknown>;
	const values: Array<{ label: string; value: string }> = [];
	if (type === ActivityType.RUN && typeof metrics.averagePace === "number") {
		values.push({
			label: "Average pace",
			value: formatPace(metrics.averagePace, true),
		});
	}
	if (type === ActivityType.BIKE && typeof metrics.averageSpeed === "number") {
		values.push({
			label: "Average speed",
			value: formatSpeed(metrics.averageSpeed),
		});
	}
	if (typeof metrics.averageHeartRate === "number") {
		values.push({
			label: "Average heart rate",
			value: `${Math.round(metrics.averageHeartRate)} bpm`,
		});
	}
	if (typeof metrics.maximumHeartRate === "number") {
		values.push({
			label: "Maximum heart rate",
			value: `${Math.round(metrics.maximumHeartRate)} bpm`,
		});
	}
	return values;
}

export function ActivityCardTemplate({
	activity,
	gears,
	children,
	showDetailsButton = false,
	showExtendedTextFields = false,
	onActivityRefresh,
}: ActivityCardTemplateProps) {
	const { isDarkMode } = useTheme();
	const { client, type } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { store } = useStore();
	const [activityData, setActivityData] =
		useState<DbActivityPopulated>(activity);
	const [activityName, setActivityName] = useState(activity.name || "");
	const [activityNotes, setActivityNotes] = useState(activity.notes || "");
	const [activityInsight, setActivityInsight] = useState(
		activity.insight || "",
	);
	const [activityDescription, setActivityDescription] = useState(
		activity.description || "",
	);
	const [fileStateVersion, setFileStateVersion] = useState(0);
	const navigate = useNavigate();

	useEffect(() => {
		setActivityData(activity);
		setActivityName(activity.name || "");
		setActivityNotes(activity.notes || "");
		setActivityInsight(activity.insight || "");
		setActivityDescription(activity.description || "");
	}, [activity]);

	const refreshActivity = useCallback(async () => {
		const result = await client.getActivity(activity.id);
		if (result.success && result.data) {
			setActivityData(result.data);
			setActivityName(result.data.name || "");
			setActivityNotes(result.data.notes || "");
			setActivityInsight(result.data.insight || "");
			setActivityDescription(result.data.description || "");
			await onActivityRefresh?.();
		} else if (!result.success) {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
	}, [activity.id, client, onActivityRefresh]);

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

	const handleInsightChange = (newInsight: string) => {
		setActivityInsight(newInsight);
		if (newInsight !== activityData.insight) {
			void handleEditActivity("insight", newInsight);
		}
	};

	const handleDescriptionChange = (newDescription: string) => {
		setActivityDescription(newDescription);
		if (newDescription !== activityData.description) {
			void handleEditActivity("description", newDescription);
		}
	};

	const notifyFileStateChange = useCallback(() => {
		setFileStateVersion((current) => current + 1);
	}, []);

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
	const isRaceEligibleActivity =
		activityData.type === ActivityType.RUN ||
		activityData.type === ActivityType.BIKE;
	const performanceMetrics = getPerformanceMetrics(
		activityData.type,
		activityData.metadata,
	);

	return (
		<Box>
			<SectionContainer hasBorder>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<ActivityTypeIcon type={activityData.type} />
						{isRaceEligibleActivity && activityData.isEvent === 1 && (
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

			{performanceMetrics.length > 0 && (
				<SectionContainer hasBorder className="flex flex-col">
					{performanceMetrics.map((metric) => (
						<div
							key={metric.label}
							className="flex items-center gap-2 text-sm leading-none"
						>
							<span
								className={`inline-flex items-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
							>
								{metric.label}:
							</span>
							<span
								className={`inline-flex items-center ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}
							>
								{metric.value}
							</span>
						</div>
					))}
				</SectionContainer>
			)}

			<SectionContainer
				hasBorder
				className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
			>
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:space-x-4">
					<ProviderRow
						activityId={activity.id}
						activityType={activityData.type}
						provider={Providers.GARMIN}
						hasConnection={!!garminConnection}
						connectionId={garminConnection?.id}
						isOriginalSource={!!garminConnection?.original}
						hasBeenExported={false}
						uploadCandidates={[
							...(corosConnection
								? [
										{
											provider: Providers.COROS,
											activityId: corosConnection.id,
										},
									]
								: []),
							...(stravaConnection
								? [
										{
											provider: Providers.STRAVA,
											activityId: stravaConnection.id,
										},
									]
								: []),
						]}
						fileStateVersion={fileStateVersion}
						notifyFileStateChange={notifyFileStateChange}
						refreshData={refreshActivity}
					/>
					<ProviderRow
						activityId={activity.id}
						activityType={activityData.type}
						provider={Providers.COROS}
						hasConnection={!!corosConnection}
						connectionId={corosConnection?.id}
						isOriginalSource={!!corosConnection?.original}
						hasBeenExported={false}
						uploadCandidates={[]}
						fileStateVersion={fileStateVersion}
						notifyFileStateChange={notifyFileStateChange}
						refreshData={refreshActivity}
					/>
					<ProviderRow
						activityId={activity.id}
						activityType={activityData.type}
						provider={Providers.STRAVA}
						hasConnection={!!stravaConnection}
						connectionId={stravaConnection?.id}
						isOriginalSource={!!stravaConnection?.original}
						hasBeenExported
						uploadCandidates={[]}
						fileStateVersion={fileStateVersion}
						notifyFileStateChange={notifyFileStateChange}
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
				<div className="space-y-4">
					<div className="space-y-1">
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
					</div>
					{showExtendedTextFields && (
						<>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<Pencil size={16} className="text-gray-500" />
									<span
										className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Insight
									</span>
								</div>
								<EditableText
									value={activityInsight}
									onSave={handleInsightChange}
									className="w-full"
									placeholder="Enter activity insight..."
									useTextArea
								/>
							</div>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<Pencil size={16} className="text-gray-500" />
									<span
										className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Description
									</span>
								</div>
								<EditableText
									value={activityDescription}
									onSave={handleDescriptionChange}
									className="w-full"
									placeholder="Enter activity description..."
									useTextArea
								/>
							</div>
						</>
					)}
				</div>
			</SectionContainer>
		</Box>
	);
}
