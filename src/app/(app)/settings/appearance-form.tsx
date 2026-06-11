"use client";

import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { ACCENTS, useAccent } from "@/components/accent-provider";
import { cn } from "@/lib/utils";

export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Mode</p>
        <div className="flex gap-1.5">
          {(
            [
              { key: "light", label: "Light", icon: Sun },
              { key: "dark", label: "Dark", icon: Moon },
              { key: "system", label: "System", icon: Monitor },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => setTheme(m.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
                theme === m.key
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Accent color</p>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              onClick={() => setAccent(a.key)}
              title={a.label}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-shadow",
                accent === a.key && "ring-2 ring-offset-2 ring-offset-background"
              )}
              style={{
                backgroundColor: a.swatch,
                ["--tw-ring-color" as string]: a.swatch,
              }}
              aria-label={a.label}
            >
              {accent === a.key && (
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Buttons, checkboxes, active states pick up the accent.
        </p>
      </div>
    </div>
  );
}
