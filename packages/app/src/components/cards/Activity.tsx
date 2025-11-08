import {
	ActivityType,
	type DbActivityPopulated,
	type IDbGear,
} from "@repo/types";
import { BikeCard } from "./bike/index.js";
import { CardioCard } from "./cardio/index.js";
import { HikeCard } from "./hike/index.js";
import { OtherActivityCard } from "./other/index.js";
import { RunningCard } from "./run/index.js";

interface ActivityCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
	showDetailsButton?: boolean;
}

export function ActivityCard({
	activity,
	gears,
	showDetailsButton,
}: ActivityCardProps) {
	if (activity.type === ActivityType.RUN) {
		return (
			<RunningCard
				activity={activity}
				gears={gears}
				showDetailsButton={showDetailsButton}
			/>
		);
	}
	if (activity.type === ActivityType.BIKE) {
		return (
			<BikeCard
				activity={activity}
				gears={gears}
				showDetailsButton={showDetailsButton}
			/>
		);
	}
	if (activity.type === ActivityType.HIKE) {
		return (
			<HikeCard
				activity={activity}
				gears={gears}
				showDetailsButton={showDetailsButton}
			/>
		);
	}
	if (activity.type === ActivityType.CARDIO) {
		return (
			<CardioCard
				activity={activity}
				gears={gears}
				showDetailsButton={showDetailsButton}
			/>
		);
	}
	if (activity.type === ActivityType.SWIM) {
		return (
			<CardioCard
				activity={activity}
				gears={gears}
				showDetailsButton={showDetailsButton}
			/>
		);
	}
	return (
		<OtherActivityCard
			activity={activity}
			gears={gears}
			showDetailsButton={showDetailsButton}
		/>
	);
}
