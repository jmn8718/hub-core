import {
	ActivityType,
	type DbActivityPopulated,
	type IDbGear,
} from "@repo/types";
import { BikeCard } from "./bike/index.js";
import { OtherActivityCard } from "./other/index.js";
import { RunningCard } from "./run/index.js";

interface ActivityCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
}

export function ActivityCard({ activity, gears }: ActivityCardProps) {
	if (activity.type === ActivityType.RUN) {
		return <RunningCard activity={activity} gears={gears} />;
	}
	if (activity.type === ActivityType.BIKE) {
		return <BikeCard activity={activity} gears={gears} />;
	}
	return <OtherActivityCard activity={activity} gears={gears} />;
}
