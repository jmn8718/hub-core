import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { type ThemeColors, themeColors } from "../utils/style.js";

interface ThemeContextType {
	isDarkMode: boolean;
	colors: ThemeColors;
	toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isDarkMode, setIsDarkMode] = useState(() => {
		const saved = localStorage.getItem("darkMode");
		return saved ? JSON.parse(saved) : false;
	});

	useEffect(() => {
		localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
		if (isDarkMode) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [isDarkMode]);

	const toggleDarkMode = () => {
		setIsDarkMode(!isDarkMode);
	};

	return (
		<ThemeContext.Provider
			value={{
				isDarkMode,
				toggleDarkMode,
				colors: themeColors[isDarkMode ? "dark" : "light"],
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};
