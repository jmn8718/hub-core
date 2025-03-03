import { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar.js";
import { useTheme } from "../contexts/ThemeContext.js";

export const Layout = ({ children }: PropsWithChildren) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} transition-colors duration-200`}
    >
      <Sidebar />
      <div className="pl-16">{children}</div>
    </div>
  );
};
