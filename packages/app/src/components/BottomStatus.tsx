import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { cn } from "@repo/ui";
import { Routes } from "../constants.js";
import { useLoading } from "../contexts/LoadingContext.js";
import { useTheme } from "../contexts/ThemeContext.js";

export function BottomStatus() {
  const location = useLocation();
  const { isLocalLoading } = useLoading();
  const { isDarkMode } = useTheme();

  return (
    location.pathname !== Routes.SETTINGS && (
      <div
        className={cn(
          "fixed bottom-0 right-0 p-3 shadow-lg flex items-center gap-2 transition-all duration-300 ease-in-out transform",
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-700",
          isLocalLoading
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0",
        )}
      >
        <Loader2
          size={20}
          className={cn(
            "transition-all duration-200",
            isLocalLoading ? "animate-spin opacity-100" : "opacity-30",
          )}
        />
      </div>
    )
  );
}
