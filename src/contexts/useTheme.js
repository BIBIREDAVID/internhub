import { useContext } from "react";
import { ThemeContext } from "./theme-context-instance";

export function useTheme() {
  return useContext(ThemeContext);
}
