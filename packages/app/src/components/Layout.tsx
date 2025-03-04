import React from "react";
import { Atom, Database, Dumbbell, Home, Settings, Table } from "lucide-react";
import { ToastContainer } from "react-toastify";
import { Routes as AppRoutes } from "../constants.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { Sidebar } from "./Sidebar.js";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} transition-colors duration-200`}
    >
      <Sidebar
        sidebarItems={[
          { icon: Home, href: AppRoutes.HOME, label: "Home" },
          { icon: Database, href: AppRoutes.DATA, label: "Data" },
          { icon: Table, href: AppRoutes.TABLE, label: "Table" },
          { icon: Atom, href: AppRoutes.PROVIDERS, label: "Providers" },
          { icon: Dumbbell, href: AppRoutes.GEAR, label: "Gear" },
          { icon: Settings, href: AppRoutes.SETTINGS, label: "Settings" },
          // { icon: CirclePlus, href: AppRoutes.ADD, label: 'Add' },
        ]}
      />
      <div className="p-0 pl-16">
        {children}
        <ToastContainer position="bottom-right" autoClose={5000} />
      </div>
    </div>
  );
};
