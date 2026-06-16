import { requireUser } from "@/lib/session";
import { getAiSettingsSafe } from "@/actions/ai-settings";
import { getVaultMeta } from "@/actions/vault";
import { getTags } from "@/actions/organize";
import { getAppConfig } from "@/actions/admin";
import { ProfileForm, SignOutButton, SessionsManager } from "./settings-client";
import { AiSettingsForm } from "./ai-settings-form";
import { AppearanceForm } from "./appearance-form";
import { TagsSettings } from "./tags-settings";
import { VaultResetForm } from "./vault-reset-form";
import { AdminSettings } from "./admin-settings";
import { SettingsShell } from "./settings-shell";
import { ShortcutsSettings } from "./shortcuts-settings";
import { PushSetup } from "@/components/shell/push-setup";
import { getTokenForUser, createTokenForUser } from "@/lib/api-tokens";

export default async function SettingsPage() {
  const user = await requireUser();
  const [ai, vaultMeta, tagRows, config] = await Promise.all([
    getAiSettingsSafe(),
    getVaultMeta(),
    getTags(),
    getAppConfig(),
  ]);

  let shortcutsToken = await getTokenForUser(user.id);
  if (!shortcutsToken) shortcutsToken = await createTokenForUser(user.id);

  const sections = {
    account: (
      <div className="space-y-8">
        <div>
          <h2 className="mb-1 text-base font-semibold">Profile</h2>
          <p className="mb-4 text-xs text-muted-foreground">Update your name and password.</p>
          <div className="rounded-xl border border-border p-5">
            <ProfileForm initialName={user.name} email={user.email} />
          </div>
        </div>
        <div>
          <h2 className="mb-1 text-base font-semibold">Sessions</h2>
          <p className="mb-4 text-xs text-muted-foreground">Devices currently signed in.</p>
          <div className="rounded-xl border border-border p-5">
            <SessionsManager />
          </div>
        </div>
        <div>
          <h2 className="mb-1 text-base font-semibold">Sign out</h2>
          <p className="mb-4 text-xs text-muted-foreground">Sign out on this device.</p>
          <SignOutButton />
        </div>
      </div>
    ),
    appearance: (
      <div>
        <h2 className="mb-1 text-base font-semibold">Appearance</h2>
        <p className="mb-6 text-xs text-muted-foreground">Customize how Life Grid looks for you.</p>
        <div className="rounded-xl border border-border p-5">
          <AppearanceForm />
        </div>
      </div>
    ),
    notifications: (
      <div>
        <h2 className="mb-1 text-base font-semibold">Notifications</h2>
        <p className="mb-6 text-xs text-muted-foreground">
          Push notifications for task reminders — works even when the app is closed.
        </p>
        <PushSetup />
      </div>
    ),
    ai: (
      <div>
        <h2 className="mb-1 text-base font-semibold">AI</h2>
        <p className="mb-6 text-xs text-muted-foreground">API keys and model configuration.</p>
        <div className="rounded-xl border border-border p-5">
          <AiSettingsForm {...ai} />
        </div>
      </div>
    ),
    tags: (
      <div>
        <h2 className="mb-1 text-base font-semibold">Tags</h2>
        <p className="mb-6 text-xs text-muted-foreground">
          Create and manage tags for organising tasks.
        </p>
        <div className="rounded-xl border border-border p-5">
          <TagsSettings initialTags={tagRows.map((t) => ({ id: t.id, name: t.name, color: t.color }))} />
        </div>
      </div>
    ),
    vault: (
      <div>
        <h2 className="mb-1 text-base font-semibold">Vault</h2>
        <p className="mb-6 text-xs text-muted-foreground">
          Change your master password or wipe the vault to start fresh.
        </p>
        <div className="rounded-xl border border-border p-5">
          <VaultResetForm hasVault={!!vaultMeta} />
        </div>
      </div>
    ),
    shortcuts: (
      <div>
        <h2 className="mb-1 text-base font-semibold">iOS Shortcuts</h2>
        <p className="mb-6 text-xs text-muted-foreground">
          Connect the iOS Shortcuts app to your life-os via API token.
        </p>
        <div className="rounded-xl border border-border p-5">
          <ShortcutsSettings initialToken={shortcutsToken} />
        </div>
      </div>
    ),
    admin: (
      <div>
        <h2 className="mb-1 text-base font-semibold">Admin</h2>
        <p className="mb-6 text-xs text-muted-foreground">
          Super-admin controls for this workspace.
        </p>
        <div className="rounded-xl border border-border p-5">
          <AdminSettings allowSignups={config.allowSignups} />
        </div>
      </div>
    ),
  };

  return <SettingsShell sections={sections} />;
}
