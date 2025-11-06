import {
	ActivityType,
	type DbActivityPopulated,
	type IDbGear,
} from "@repo/types";
import { RunningCard } from "./run/index.js";

interface ActivityCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
}

export function ActivityCard({ activity, gears }: ActivityCardProps) {
	if (activity.type === ActivityType.RUN) {
		return <RunningCard activity={activity} gears={gears} />;
	}

	return <div>TYPE ({activity.type}) not supported</div>;
}
