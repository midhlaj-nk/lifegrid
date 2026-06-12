"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Moon, PanelLeft, Settings, Sun, X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  areas: { id: string; name: string; color: string }[];
  projects: { id: string; name: string; color: string; areaId: string | null }[];
  tags: { id: string; name: string; color: string }[];
  userName: string;
  children: React.ReactNode;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}

export function AppShell({ areas, projects, tags, userName, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  // wide canvases need the full viewport
  const fullWidth = pathname.startsWith("/sheets/") || pathname.startsWith("/apps");

  return (
    <div className="flex min-h-dvh">
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-card transition-[width] md:block",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
        )}
      >
        <div className="flex items-center justify-between px-3 pt-3">
          <span className="px-2 text-sm font-semibold tracking-tight">Life OS</span>
          <div className="flex items-center">
            <ThemeToggle />
            <Link
              href="/settings"
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <Sidebar areas={areas} projects={projects} tags={tags} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute inset-y-0 left-0 w-72 border-r border-border bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="px-2 text-sm font-semibold">Life OS</span>
              <div className="flex items-center">
                <ThemeToggle />
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-muted-foreground"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-muted-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Sidebar
              areas={areas}
              projects={projects}
              tags={tags}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:px-5">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent md:block"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <Link
            href="/apps"
            className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent md:block"
            aria-label="All apps"
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold md:hidden">Life OS</span>
          <div className="ml-auto flex items-center gap-1 md:hidden">
            <ThemeToggle />
          </div>
          <span className="ml-auto hidden text-xs text-muted-foreground md:block">
            {userName}
          </span>
        </header>
        <main className="flex-1 px-3 pb-24 pt-4 md:px-8 md:pb-8">
          <div className={cn("mx-auto w-full", fullWidth ? "max-w-none" : "max-w-3xl")}>
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav onMenu={() => setMobileOpen(true)} />
    </div>
  );
}
