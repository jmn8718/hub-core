import { ActivityType } from "@repo/types";
import { cn } from "@repo/ui";
import { Bike, Dumbbell, Rabbit } from "lucide-react";
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
		default:
			Icon = Dumbbell;
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
