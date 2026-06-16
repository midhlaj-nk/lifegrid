"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Inbox, LayoutGrid, Menu, Plus, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
  { href: "/apps", label: "Apps", icon: LayoutGrid },
];

export function MobileBottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  function openQuickAdd() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "q", bubbles: true })
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center border-t border-border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
              {item.label}
            </Link>
          );
        })}

        {/* Quick-add FAB */}
        <button
          onClick={openQuickAdd}
          className="mx-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          aria-label="Quick add task"
        >
          <Plus className="h-5 w-5" />
        </button>

        <button
          onClick={onMenu}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  );
}
