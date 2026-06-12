import Link from "next/link";
import { requireUser } from "@/lib/session";
import { LogoIconBadge } from "@/components/brand/logo";

const APPS: { href: string; label: string; icon: string; color: string }[] = [
  { href: "/", label: "Dashboard", icon: "🏠", color: "#6366f1" },
  { href: "/today", label: "Tasks", icon: "✅", color: "#10b981" },
  { href: "/notes", label: "Notes", icon: "📝", color: "#f59e0b" },
  { href: "/sheets", label: "Sheets", icon: "📊", color: "#22c55e" },
  { href: "/calendar", label: "Calendar", icon: "📅", color: "#0ea5e9" },
  { href: "/events", label: "Events", icon: "🎉", color: "#ec4899" },
  { href: "/habits", label: "Habits", icon: "🔥", color: "#f97316" },
  { href: "/goals", label: "Goals", icon: "🎯", color: "#8b5cf6" },
  { href: "/finance", label: "Finance", icon: "💰", color: "#14b8a6" },
  { href: "/vault", label: "Vault", icon: "🔐", color: "#64748b" },
  { href: "/worklog", label: "Worklog", icon: "💼", color: "#3b82f6" },
  { href: "/assistant", label: "Assistant", icon: "🤖", color: "#a855f7" },
  { href: "/insights", label: "Insights", icon: "✨", color: "#eab308" },
  { href: "/settings", label: "Settings", icon: "⚙️", color: "#71717a" },
];

export default async function AppsPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center py-8">
      <LogoIconBadge size={56} className="mb-3" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Life Grid</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Where to, {user.name.split(" ")[0]}?
      </p>
      <div className="grid w-full max-w-2xl grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
        {APPS.map((app) => (
          <Link
            key={app.href}
            href={app.href}
            className="group flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-accent"
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm transition-transform group-hover:scale-105 group-active:scale-95"
              style={{ backgroundColor: `${app.color}22` }}
            >
              {app.icon}
            </span>
            <span className="text-xs font-medium">{app.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
