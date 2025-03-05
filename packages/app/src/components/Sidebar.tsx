import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LucideProps } from "lucide-react";
import { cn } from "@repo/ui";
import { useTheme } from "../contexts/ThemeContext.js";

export function Sidebar({
  sidebarItems,
}: {
  sidebarItems: {
    icon: React.ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
    >;
    href: string;
    label: string;
  }[];
}) {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigation = useNavigate();
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-12 shadow-lg flex flex-col items-center py-6 transition-colors duration-200",
        isDarkMode ? "bg-gray-800" : "bg-white",
      )}
    >
      <nav className="flex flex-col items-center space-y-4">
        {sidebarItems.map(({ icon: Icon, href, label }) => (
          <button
            key={href}
            type="button"
            onClick={() => navigation(href)}
            className={cn(
              "relative group flex items-center justify-center w-8 h-8 rounded-lg",
              isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-200",
            )}
          >
            <Icon
              size={24}
              color={
                location.pathname === href
                  ? isDarkMode
                    ? "white"
                    : "black"
                  : "gray"
              }
            />
            <span
              className={`sr-only absolute left-full ml-2 px-2 py-1 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-800"
              } text-white text-sm rounded opacity-0 group-hover:opacity-100 whitespace-nowrap`}
            >
              {label}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
