import { requireUser } from "@/lib/session";
import { getAiSettingsSafe } from "@/actions/ai-settings";
import { ProfileForm, SignOutButton, SessionsManager } from "./settings-client";
import { AiSettingsForm } from "./ai-settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const ai = await getAiSettingsSafe();

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

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">AI</h2>
        <AiSettingsForm {...ai} />
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Sessions</h2>
        <SessionsManager />
        <p className="pt-2 text-xs text-muted-foreground">
          Sign out on this device:
        </p>
        <SignOutButton />
      </section>
    </div>
  );
}
