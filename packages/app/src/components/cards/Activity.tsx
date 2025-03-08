import { ActivityType, DbActivityPopulated, IDbGear } from "@repo/types";
import { RunningCard } from "./Running.js";

interface ActivityCardProps {
  activity: DbActivityPopulated;
  gears: IDbGear[];
}

export function ActivityCard({ activity, gears }: ActivityCardProps) {
  if (activity.type === ActivityType.RUN) {
    return <RunningCard activity={activity} gears={gears} />;
  }

  return <div>TYPE not supported</div>;
}
