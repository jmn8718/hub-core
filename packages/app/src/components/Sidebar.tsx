import {
  Home,
  Users,
  Settings,
  Database,
  Table,
  Dumbbell,
  PlusCircle,
} from "lucide-react";
import { Link } from "./Link.js";
import { useTheme } from "../contexts/ThemeContext.js";

export const Sidebar = () => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`fixed left-0 top-0 h-full w-16 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-lg flex flex-col items-center py-6 transition-colors duration-200`}
    >
      <div className="space-y-8">
        <Link href="/" icon={<Home size={24} />} label="Home" />
        <Link
          href="/connections"
          icon={<Users size={24} />}
          label="Connections"
        />
        <Link href="/data" icon={<Database size={24} />} label="Data" />
        <Link href="/table" icon={<Table size={24} />} label="Table View" />
        <Link href="/gear" icon={<Dumbbell size={24} />} label="Gear" />
        <Link
          href="/add-workout"
          icon={<PlusCircle size={24} />}
          label="Add Workout"
        />
        <Link href="/settings" icon={<Settings size={24} />} label="Settings" />
      </div>
    </div>
  );
};
