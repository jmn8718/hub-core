import React from "react";
import { cn } from "@repo/ui";
import { useTheme } from "../contexts/ThemeContext.js";

interface PageH1Props {
  text: string;
  classes?: string;
}

export const H1: React.FC<PageH1Props> = ({ text, classes = "" }) => {
  const { isDarkMode } = useTheme();

  return (
    <h1
      className={cn(
        "text-4xl font-bold text-center mb-12",
        isDarkMode ? "text-white" : "text-gray-900",
        classes || "",
      )}
    >
      {text}
    </h1>
  );
};
