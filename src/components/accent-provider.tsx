"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const ACCENTS = [
  { key: "neutral", label: "Neutral", swatch: "#3f3f46" },
  { key: "indigo", label: "Indigo", swatch: "#6366f1" },
  { key: "emerald", label: "Emerald", swatch: "#10b981" },
  { key: "rose", label: "Rose", swatch: "#f43f5e" },
  { key: "amber", label: "Amber", swatch: "#f59e0b" },
  { key: "violet", label: "Violet", swatch: "#8b5cf6" },
  { key: "sky", label: "Sky", swatch: "#0ea5e9" },
] as const;

const STORAGE_KEY = "accent-theme";

const AccentContext = createContext<{
  accent: string;
  setAccent: (a: string) => void;
}>({ accent: "neutral", setAccent: () => {} });

export function useAccent() {
  return useContext(AccentContext);
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState("neutral");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? "neutral";
    setAccentState(stored);
    apply(stored);
  }, []);

  function apply(a: string) {
    if (a === "neutral") delete document.documentElement.dataset.accent;
    else document.documentElement.dataset.accent = a;
  }

  function setAccent(a: string) {
    setAccentState(a);
    localStorage.setItem(STORAGE_KEY, a);
    apply(a);
  }

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}
