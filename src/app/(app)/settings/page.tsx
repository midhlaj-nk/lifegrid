import { requireUser } from "@/lib/session";
import { ProfileForm, SignOutButton } from "./settings-client";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Profile and account</p>
      </header>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Profile</h2>
        <ProfileForm initialName={user.name} email={user.email} />
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Session</h2>
        <p className="text-xs text-muted-foreground">
          Signs you out on this device.
        </p>
        <SignOutButton />
      </section>
    </div>
  );
}
