"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, signOut } from "@/lib/auth-client";

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    const { error } = await authClient.updateUser({ name });
    setSaving(false);
    if (error) setErr(error.message ?? "Failed to update");
    else {
      setMsg("Profile updated");
      router.refresh();
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setSaving(false);
    if (error) setErr(error.message ?? "Failed to change password");
    else {
      setMsg("Password changed — other sessions revoked");
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  const input =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <form onSubmit={saveName} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Email</label>
          <input value={email} disabled className={`${input} opacity-60`} />
        </div>
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs text-muted-foreground">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
        </div>
        <button
          disabled={saving || !name.trim()}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Save profile
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Change password
        </h3>
        <input
          type="password"
          placeholder="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={input}
        />
        <input
          type="password"
          placeholder="New password (min 8 chars)"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={input}
        />
        <button
          disabled={saving || !currentPassword || newPassword.length < 8}
          className="h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Change password
        </button>
      </form>

      {msg && <p className="text-sm text-emerald-500">{msg}</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className="h-9 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
    >
      Sign out
    </button>
  );
}
