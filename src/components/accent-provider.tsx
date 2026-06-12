"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const ACCENTS = [
  { key: "neutral", label: "Neutral", swatch: "#3f3f46" },
  { key: "indigo",  label: "Indigo",  swatch: "#6366f1" },
  { key: "emerald", label: "Emerald", swatch: "#10b981" },
  { key: "rose",    label: "Rose",    swatch: "#f43f5e" },
  { key: "amber",   label: "Amber",   swatch: "#f59e0b" },
  { key: "violet",  label: "Violet",  swatch: "#8b5cf6" },
  { key: "sky",     label: "Sky",     swatch: "#0ea5e9" },
] as const;

export const COLOR_THEMES = [
  {
    key: "default",
    label: "Default",
    light: { bg: "#ffffff", card: "#fafafa", border: "#e4e4e7" },
    dark:  { bg: "#0f0f0f", card: "#1a1a1a", border: "#27272a" },
  },
  {
    key: "warm",
    label: "Warm",
    light: { bg: "#fefdf8", card: "#faf9f3", border: "#e8e2d4" },
    dark:  { bg: "#141209", card: "#1e1a10", border: "#2e2a1e" },
  },
  {
    key: "lavender",
    label: "Lavender",
    light: { bg: "#fdfbff", card: "#f8f5ff", border: "#ddd5f0" },
    dark:  { bg: "#0e0d17", card: "#161424", border: "#252238" },
  },
  {
    key: "mint",
    label: "Mint",
    light: { bg: "#f9fefc", card: "#f3faf7", border: "#c8e8da" },
    dark:  { bg: "#0a1410", card: "#10201a", border: "#1e3028" },
  },
  {
    key: "slate",
    label: "Slate",
    light: { bg: "#f8fafc", card: "#f1f5f9", border: "#cbd5e1" },
    dark:  { bg: "#0c0e14", card: "#13161f", border: "#1e2333" },
  },
  {
    key: "sepia",
    label: "Sepia",
    light: { bg: "#fdf8f0", card: "#f8f0e4", border: "#ddd0b8" },
    dark:  { bg: "#160e08", card: "#1f1610", border: "#312418" },
  },
] as const;

export type ColorThemeKey = (typeof COLOR_THEMES)[number]["key"];

const AccentContext = createContext<{
  accent: string;
  setAccent: (a: string) => void;
  colorTheme: ColorThemeKey;
  setColorTheme: (t: ColorThemeKey) => void;
}>({ accent: "neutral", setAccent: () => {}, colorTheme: "default", setColorTheme: () => {} });

export function useAccent() {
  return useContext(AccentContext);
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState("neutral");
  const [colorTheme, setColorThemeState] = useState<ColorThemeKey>("default");

  useEffect(() => {
    const a = localStorage.getItem("accent-theme") ?? "neutral";
    const t = (localStorage.getItem("color-theme") ?? "default") as ColorThemeKey;
    setAccentState(a);
    setColorThemeState(t);
    applyAccent(a);
    applyColorTheme(t);
  }, []);

  function applyAccent(a: string) {
    if (a === "neutral") delete document.documentElement.dataset.accent;
    else document.documentElement.dataset.accent = a;
  }

  function applyColorTheme(t: ColorThemeKey) {
    if (t === "default") delete document.documentElement.dataset.colorTheme;
    else document.documentElement.dataset.colorTheme = t;
  }

  function setAccent(a: string) {
    setAccentState(a);
    localStorage.setItem("accent-theme", a);
    applyAccent(a);
  }

  function setColorTheme(t: ColorThemeKey) {
    setColorThemeState(t);
    localStorage.setItem("color-theme", t);
    applyColorTheme(t);
  }

  return (
    <AccentContext.Provider value={{ accent, setAccent, colorTheme, setColorTheme }}>
      {children}
    </AccentContext.Provider>
  );
}
