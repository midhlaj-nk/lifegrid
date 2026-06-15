"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, LayoutDashboard, LayoutGrid, Menu, Plus, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/apps", label: "Apps", icon: LayoutGrid },
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

export function MobileBottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  function openQuickAdd() {
    // Dispatch synthetic key event — GlobalQuickAdd listens on window
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "q", bubbles: true })
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[10px]",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}

      {/* Quick-add fab */}
      <button
        onClick={openQuickAdd}
        className="mx-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
        aria-label="Quick add task"
      >
        <Plus className="h-5 w-5" />
      </button>

      <button
        onClick={onMenu}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[10px] text-muted-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
        Menu
      </button>
    </nav>
  );
}
