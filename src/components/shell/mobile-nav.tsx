"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Inbox, Menu, Plus, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  null, // center FAB slot
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
  { href: "/apps", label: "More", icon: Menu, isMenu: true },
];

export function MobileBottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  function openQuickAdd() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
  }

  return (
    // Outer nav: covers safe area with background colour
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 md:hidden">
      {/* inner row: sits above safe area */}
      <div
        className="flex items-center border-t border-border/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item, i) => {
          if (!item) {
            // Center FAB
            return (
              <div key="fab" className="flex flex-1 items-center justify-center">
                <button
                  onClick={openQuickAdd}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md active:scale-90 transition-transform duration-100"
                  aria-label="Quick add task"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            );
          }

          if (item.isMenu) {
            const active = false;
            return (
              <button
                key="menu"
                onClick={onMenu}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          }

          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-[22px] w-[22px] transition-transform duration-100",
                  active && "scale-110"
                )}
                strokeWidth={active ? 2.25 : 1.75}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
