import { useEffect, useState } from "react";
import { ThemeContext } from "./theme-context-instance";

const STORAGE_KEY = "internhub-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = themeName;
    try {
      window.localStorage.setItem(STORAGE_KEY, themeName);
    } catch {
      // Private browsing / storage disabled — theme just won't persist.
    }
  }, [themeName]);

  function toggleTheme() {
    setThemeName((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ themeName, isDark: themeName === "dark", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
