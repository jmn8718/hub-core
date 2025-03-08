import { DbActivityPopulated, IDbGear } from "@repo/types";

interface RunningCardProps {
  activity: DbActivityPopulated;
  gears: IDbGear[];
}

export function RunningCard({ activity, gears }: RunningCardProps) {
  return <div>r</div>;
}
