"use client";

import { useState } from "react";
import { Brush, Brain, LockKeyhole, ShieldCheck, Tag, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { key: "account",    label: "Account",    icon: User        },
  { key: "appearance", label: "Appearance", icon: Brush       },
  { key: "ai",         label: "AI",         icon: Brain       },
  { key: "tags",       label: "Tags",       icon: Tag         },
  { key: "vault",      label: "Vault",      icon: LockKeyhole },
  { key: "admin",      label: "Admin",      icon: ShieldCheck },
] as const;

type SectionKey = (typeof NAV)[number]["key"];

export function SettingsShell({
  sections,
}: {
  sections: Record<SectionKey, React.ReactNode>;
}) {
  const [active, setActive] = useState<SectionKey>("account");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Nav — horizontal scroll on mobile, vertical sidebar on md+ */}
        <nav className="md:w-44 md:shrink-0">
          <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-x-visible md:pb-0">
            {NAV.map((n) => (
              <li key={n.key} className="shrink-0 md:shrink">
                <button
                  onClick={() => setActive(n.key)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors md:w-full",
                    active === n.key
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div key={active} className="min-w-0 flex-1 animate-fade-up">
          {sections[active]}
        </div>
      </div>
    </div>
  );
}
