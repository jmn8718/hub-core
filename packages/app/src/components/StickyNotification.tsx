import React from "react";
import { Loader2 } from "lucide-react";
import { useLoading } from "../contexts/LoadingContext.js";
import { useTheme } from "../contexts/ThemeContext.js";

export const StickyNotification = () => {
  const { isLocalLoading } = useLoading();
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`fixed bottom-0 right-0 ${
        isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-700"
      } p-3 shadow-lg flex items-center gap-2 transition-all duration-300 ease-in-out transform ${
        isLocalLoading
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0"
      }`}
    >
      <Loader2 size={20} className="animate-spin" />
      <p className="text-sm">Loading data...</p>
    </div>
  );
};
