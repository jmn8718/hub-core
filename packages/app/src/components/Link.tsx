import type React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext.js";

export const Link: React.FC<{
  href: string;
  icon: React.ReactNode;
  label: string;
}> = ({ href, icon, label }) => {
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const isActive = location.pathname === href;

  return (
    <RouterLink
      to={href}
      className={`relative group flex items-center justify-center w-12 h-12 rounded-lg ${
        isActive
          ? isDarkMode
            ? "bg-gray-700"
            : "bg-gray-100"
          : isDarkMode
            ? "hover:bg-gray-700"
            : "hover:bg-gray-100"
      }`}
    >
      <div
        className={
          isActive
            ? "text-blue-500"
            : isDarkMode
              ? "text-gray-400 group-hover:text-blue-500"
              : "text-gray-600 group-hover:text-blue-600"
        }
      >
        {icon}
      </div>
      <span
        className={`absolute left-full ml-2 px-2 py-1 ${
          isDarkMode ? "bg-gray-700" : "bg-gray-800"
        } text-white text-sm rounded opacity-0 group-hover:opacity-100 whitespace-nowrap`}
      >
        {label}
      </span>
    </RouterLink>
  );
};
