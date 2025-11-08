import { ActivityType } from "@repo/types";
import { cn } from "@repo/ui";
import {
	Bike,
	Donut,
	Dumbbell,
	Footprints,
	Mountain,
	Rabbit,
	Waves,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext.js";

interface Props {
	type: ActivityType;
	classes?: string;
	darkModeColor?: string;
	lightModeColor?: string;
}

const ActivityTypeIcon: React.FC<Props> = ({
	type,
	classes = "",
	darkModeColor = "text-white",
	lightModeColor = "text-gray-800",
}) => {
	const { isDarkMode } = useTheme();

	// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
	let Icon;
	switch (type) {
		case ActivityType.RUN:
			Icon = Rabbit;
			break;
		case ActivityType.BIKE:
			Icon = Bike;
			break;
		case ActivityType.HIKE:
			Icon = Mountain;
			break;
		case ActivityType.CARDIO:
			Icon = Footprints;
			break;
		case ActivityType.SWIM:
			Icon = Waves;
			break;
		case ActivityType.GYM:
			Icon = Dumbbell;
			break;
		default:
			Icon = Donut;
			break;
	}
	return (
		<Icon
			size={14}
			className={cn(isDarkMode ? darkModeColor : lightModeColor, classes)}
		/>
	);
};

export default ActivityTypeIcon;
