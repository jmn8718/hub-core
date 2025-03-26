import type { DbActivityPopulated, IDbGear } from "@repo/types";
import { Box } from "../Box.js";

interface RunningCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
}

export function RunningCard({ activity, gears }: RunningCardProps) {
	return <Box>{activity.id}</Box>;
}
