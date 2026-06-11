"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Briefcase,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  FileClock,
  FileSpreadsheet,
  FileText,
  Flame,
  Inbox,
  LayoutDashboard,
  PartyPopper,
  Pencil,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag as TagIcon,
  Target,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CreateAreaDialog,
  CreateProjectDialog,
  EditAreaDialog,
  EditProjectDialog,
} from "./create-dialogs";

interface SidebarProps {
  areas: { id: string; name: string; color: string }[];
  projects: { id: string; name: string; color: string; areaId: string | null }[];
  tags: { id: string; name: string; color: string }[];
  onNavigate?: () => void;
}

type IconType = React.ComponentType<{ className?: string }>;

const SECTIONS: { key: string; label: string; links: { href: string; label: string; icon: IconType }[] }[] = [
  {
    key: "tasks",
    label: "Tasks",
    links: [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/today", label: "Today", icon: Sun },
      { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/completed", label: "Completed", icon: CheckCircle2 },
    ],
  },
  {
    key: "pages",
    label: "Pages",
    links: [
      { href: "/notes", label: "Notes", icon: FileText },
      { href: "/sheets", label: "Sheets", icon: FileSpreadsheet },
    ],
  },
  {
    key: "planning",
    label: "Planning",
    links: [
      { href: "/calendar", label: "Calendar", icon: CalendarRange },
      { href: "/events", label: "Events", icon: PartyPopper },
      { href: "/habits", label: "Habits", icon: Flame },
      { href: "/goals", label: "Goals", icon: Target },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    links: [
      { href: "/finance", label: "Finance", icon: Wallet },
      { href: "/vault", label: "Vault", icon: ShieldCheck },
      { href: "/assistant", label: "Assistant", icon: Bot },
      { href: "/insights", label: "Insights", icon: Sparkles },
    ],
  },
  {
    key: "worklog",
    label: "Worklog",
    links: [
      { href: "/worklog", label: "Daily report", icon: Briefcase },
      { href: "/worklog/weekly", label: "Weekly report", icon: CalendarDays },
      { href: "/worklog/history", label: "History", icon: FileClock },
      { href: "/worklog/settings", label: "Worklog settings", icon: Settings2 },
    ],
  },
];

const STORAGE_KEY = "sidebar-sections-v1";

export function Sidebar({ areas, projects, tags, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [areaCollapsed, setAreaCollapsed] = useState<Record<string, boolean>>({});
  const [editingArea, setEditingArea] = useState<SidebarProps["areas"][number] | null>(null);
  const [editingProject, setEditingProject] = useState<SidebarProps["projects"][number] | null>(null);
  const looseProjects = projects.filter((p) => !p.areaId);

  useEffect(() => {
    try {
      setOpen(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"));
    } catch {
      // default state
    }
    setHydrated(true);
  }, []);

  function isOpen(key: string) {
    return open[key] ?? true; // sections default open
  }

  function toggleSection(key: string) {
    setOpen((o) => {
      const next = { ...o, [key]: !(o[key] ?? true) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function navLink(
    href: string,
    label: string,
    dotColor?: string,
    Icon?: IconType
  ) {
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

  function SectionHeader({
    sectionKey,
    label,
    action,
  }: {
    sectionKey: string;
    label: string;
    action?: React.ReactNode;
  }) {
    return (
      <div className="mb-1 flex items-center justify-between px-1">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex flex-1 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              !isOpen(sectionKey) && "-rotate-90"
            )}
          />
          {label}
        </button>
        {action}
      </div>
    );
  }

  // avoid a flash of wrong state before localStorage loads
  if (!hydrated) return <nav className="h-full p-3" />;

  return (
    <nav className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {SECTIONS.map((section) => (
        <div key={section.key}>
          <SectionHeader sectionKey={section.key} label={section.label} />
          {isOpen(section.key) && (
            <div className="space-y-0.5">
              {section.links.map((l) =>
                navLink(l.href, l.label, undefined, l.icon)
              )}
            </div>
          )}
        </div>
      ))}

      <div>
        <SectionHeader
          sectionKey="areas"
          label="Areas"
          action={
            <CreateAreaDialog>
              <button
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="New area"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </CreateAreaDialog>
          }
        />
        {isOpen("areas") && (
          <div className="space-y-0.5">
            {areas.map((area) => {
              const areaProjects = projects.filter((p) => p.areaId === area.id);
              const isCollapsed = areaCollapsed[area.id];
              return (
                <div key={area.id}>
                  <div className="group flex items-center">
                    <button
                      onClick={() =>
                        setAreaCollapsed((c) => ({
                          ...c,
                          [area.id]: !c[area.id],
                        }))
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
                    <button
                      onClick={() => setEditingArea(area)}
                      className="hidden rounded p-0.5 text-muted-foreground hover:text-foreground group-hover:block touch:block"
                      aria-label={`Edit ${area.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                  {!isCollapsed && areaProjects.length > 0 && (
                    <div className="ml-5 space-y-0.5 border-l border-border pl-2">
                      {areaProjects.map((p) => (
                        <div key={p.id} className="group/proj flex items-center">
                          <div className="flex-1">
                            {navLink(`/project/${p.id}`, p.name, p.color)}
                          </div>
                          <button
                            onClick={() => setEditingProject(p)}
                            className="hidden rounded p-0.5 text-muted-foreground hover:text-foreground group-hover/proj:block touch:block"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {areas.length === 0 && (
              <p className="px-2.5 text-xs text-muted-foreground/60">
                Group life into areas — Work, Health…
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          sectionKey="projects"
          label="Projects"
          action={
            <CreateProjectDialog areas={areas}>
              <button
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="New project"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </CreateProjectDialog>
          }
        />
        {isOpen("projects") && (
          <div className="space-y-0.5">
            {looseProjects.map((p) => (
              <div key={p.id} className="group/proj flex items-center">
                <div className="flex-1">
                  {navLink(`/project/${p.id}`, p.name, p.color)}
                </div>
                <button
                  onClick={() => setEditingProject(p)}
                  className="hidden rounded p-0.5 text-muted-foreground hover:text-foreground group-hover/proj:block touch:block"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            ))}
            {looseProjects.length === 0 && (
              <p className="px-2.5 text-xs text-muted-foreground/60">
                Projects without an area appear here
              </p>
            )}
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div>
          <SectionHeader sectionKey="tags" label="Tags" />
          {isOpen("tags") && (
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
          )}
        </div>
      )}

      {editingArea && (
        <EditAreaDialog area={editingArea} onClose={() => setEditingArea(null)} />
      )}
      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          areas={areas}
          onClose={() => setEditingProject(null)}
        />
      )}
    </nav>
  );
}
