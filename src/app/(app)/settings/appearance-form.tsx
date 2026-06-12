"use client";

import { useTheme } from "@/components/theme-provider";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { ACCENTS, COLOR_THEMES, type ColorThemeKey, useAccent } from "@/components/accent-provider";
import { cn } from "@/lib/utils";

export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent, colorTheme, setColorTheme } = useAccent();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="space-y-8">
      {/* Mode */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode</p>
        <div className="flex gap-2">
          {(
            [
              { key: "light",  label: "Light",  icon: Sun },
              { key: "dark",   label: "Dark",   icon: Moon },
              { key: "system", label: "System", icon: Monitor },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => setTheme(m.key)}
              className={cn(
                "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 transition-colors",
                theme === m.key
                  ? "border-primary bg-primary/8"
                  : "border-border hover:border-border/80 hover:bg-accent/50"
              )}
            >
              <m.icon className={cn("h-5 w-5", theme === m.key ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium", theme === m.key ? "text-primary" : "text-muted-foreground")}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Color theme */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color theme</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {COLOR_THEMES.map((t) => {
            const swatch = isDark ? t.dark : t.light;
            const active = colorTheme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setColorTheme(t.key as ColorThemeKey)}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all",
                  active ? "border-primary" : "border-border hover:border-border/60"
                )}
              >
                {/* Mini preview */}
                <div
                  className="relative h-12 w-full overflow-hidden rounded-lg"
                  style={{ background: swatch.bg }}
                >
                  {/* Sidebar strip */}
                  <div
                    className="absolute inset-y-0 left-0 w-[30%]"
                    style={{ background: swatch.card, borderRight: `1px solid ${swatch.border}` }}
                  />
                  {/* Content lines */}
                  <div className="absolute left-[36%] top-2 right-2 space-y-1">
                    <div className="h-1.5 w-3/4 rounded-full" style={{ background: swatch.border }} />
                    <div className="h-1 w-1/2 rounded-full" style={{ background: swatch.border, opacity: 0.6 }} />
                    <div className="h-1 w-2/3 rounded-full" style={{ background: swatch.border, opacity: 0.4 }} />
                  </div>
                  {active && (
                    <div className="absolute right-1.5 bottom-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className={cn("text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent color */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accent color</p>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              onClick={() => setAccent(a.key)}
              title={a.label}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                  accent === a.key ? "ring-2 ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
                )}
                style={{
                  backgroundColor: a.swatch,
                  ["--tw-ring-color" as string]: a.swatch,
                }}
              >
                {accent === a.key && (
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
