"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  CalendarRange,
  PartyPopper,
  CheckCircle2,
  ChevronDown,
  FileClock,
  FileText,
  Inbox,
  Plus,
  Settings2,
  Sun,
  Tag as TagIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CreateAreaDialog, CreateProjectDialog } from "./create-dialogs";

interface SidebarProps {
  areas: { id: string; name: string; color: string }[];
  projects: { id: string; name: string; color: string; areaId: string | null }[];
  tags: { id: string; name: string; color: string }[];
  onNavigate?: () => void;
}

const smartLists = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/completed", label: "Completed", icon: CheckCircle2 },
];

export function Sidebar({ areas, projects, tags, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const looseProjects = projects.filter((p) => !p.areaId);

  function navLink(href: string, label: string, dotColor?: string, Icon?: React.ComponentType<{ className?: string }>) {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          active
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
      >
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0" />
        ) : (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      <div className="space-y-0.5">
        {smartLists.map((l) => navLink(l.href, l.label, undefined, l.icon))}
      </div>

      <div className="space-y-0.5">
        {navLink("/notes", "Notes", undefined, FileText)}
        {navLink("/calendar", "Calendar", undefined, CalendarRange)}
        {navLink("/events", "Events", undefined, PartyPopper)}
      </div>

      <div>
        <div className="mb-1 px-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Worklog
          </span>
        </div>
        <div className="space-y-0.5">
          {navLink("/worklog", "Daily report", undefined, Briefcase)}
          {navLink("/worklog/weekly", "Weekly report", undefined, CalendarDays)}
          {navLink("/worklog/history", "History", undefined, FileClock)}
          {navLink("/worklog/settings", "Worklog settings", undefined, Settings2)}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between px-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Areas
          </span>
          <CreateAreaDialog>
            <button className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="New area">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </CreateAreaDialog>
        </div>
        <div className="space-y-0.5">
          {areas.map((area) => {
            const areaProjects = projects.filter((p) => p.areaId === area.id);
            const isCollapsed = collapsed[area.id];
            return (
              <div key={area.id}>
                <div className="group flex items-center">
                  <button
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [area.id]: !c[area.id] }))
                    }
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle area"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isCollapsed && "-rotate-90"
                      )}
                    />
                  </button>
                  <div className="flex-1">
                    {navLink(`/area/${area.id}`, area.name, area.color)}
                  </div>
                </div>
                {!isCollapsed && areaProjects.length > 0 && (
                  <div className="ml-5 space-y-0.5 border-l border-border pl-2">
                    {areaProjects.map((p) =>
                      navLink(`/project/${p.id}`, p.name, p.color)
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between px-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </span>
          <CreateProjectDialog areas={areas}>
            <button className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="New project">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </CreateProjectDialog>
        </div>
        <div className="space-y-0.5">
          {looseProjects.map((p) =>
            navLink(`/project/${p.id}`, p.name, p.color)
          )}
          {looseProjects.length === 0 && (
            <p className="px-2.5 text-xs text-muted-foreground/60">
              Projects without an area appear here
            </p>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <div className="mb-1 px-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </span>
          </div>
          <div className="flex flex-wrap gap-1 px-2.5">
            {tags.map((t) => (
              <Link
                key={t.id}
                href={`/tag/${t.id}`}
                onClick={onNavigate}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
              >
                <TagIcon className="h-3 w-3" style={{ color: t.color }} />
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
