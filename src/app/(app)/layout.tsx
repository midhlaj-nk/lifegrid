import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/session";
import { getSidebarData } from "@/lib/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const { areas, projects, tags } = await getSidebarData(user.id);

  return (
    <AppShell
      areas={areas}
      projects={projects}
      tags={tags}
      userName={user.name}
    >
      {children}
    </AppShell>
  );
}
