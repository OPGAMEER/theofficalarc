import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeKey = "LIGHT" | "DARK" | "INDIGO" | "VIOLET";
const KEY = "arc_theme";
const CLASS_MAP: Record<ThemeKey, string> = {
  LIGHT: "theme-light",
  DARK: "theme-dark",
  INDIGO: "theme-indigo",
  VIOLET: "theme-violet",
};

type Ctx = { theme: ThemeKey; setTheme: (k: ThemeKey) => void };
const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    if (typeof window === "undefined") return "LIGHT";
    const v = localStorage.getItem(KEY);
    return (v === "LIGHT" || v === "DARK" || v === "INDIGO" || v === "VIOLET") ? v : "LIGHT";
  });

  useEffect(() => {
    const root = document.documentElement;
    Object.values(CLASS_MAP).forEach((c) => root.classList.remove(c));
    root.classList.add(CLASS_MAP[theme]);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useArcTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useArcTheme must be used inside ThemeProvider");
  return ctx;
}
