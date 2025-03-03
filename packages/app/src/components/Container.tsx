import type React from "react";
import { useTheme } from "../contexts/ThemeContext.js";

interface ContainerProps {
  children: React.ReactNode;
  title?: string;
}

export const Container: React.FC<ContainerProps> = ({ children, title }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className="py-12 px-4">
      {title && (
        <h1
          className={`text-4xl font-bold text-center mb-12 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {title}
        </h1>
      )}
      <div className="max-w-4xl mx-auto min-w-[480px]">{children}</div>
    </div>
  );
};
