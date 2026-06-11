"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  StickyNote,
  Trash2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import {
  deriveKey,
  encrypt,
  decrypt,
  newSalt,
  makeKeyCheck,
  verifyKeyCheck,
  storeSessionKey,
  loadSessionKey,
  clearSessionKey,
  generatePassword,
  PBKDF2_ITERATIONS,
  type EncryptedBlob,
} from "@/lib/vault-crypto";
import {
  setupVault,
  createVaultItem,
  updateVaultItem,
  deleteVaultItem,
} from "@/actions/vault";
import { cn } from "@/lib/utils";

type ItemType = "login" | "apikey" | "note" | "pem";

interface RawItem {
  id: string;
  type: ItemType;
  data: string;
  updatedAt: string;
}

interface DecryptedItem {
  id: string;
  type: ItemType;
  fields: Record<string, string>;
  updatedAt: string;
}

const TYPE_META: Record<ItemType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  login: { label: "Logins", icon: Globe },
  apikey: { label: "API keys", icon: KeyRound },
  note: { label: "Secure notes", icon: StickyNote },
  pem: { label: "Servers / PEM", icon: Server },
};

const TYPE_FIELDS: Record<ItemType, { key: string; label: string; secret?: boolean; multiline?: boolean; placeholder?: string }[]> = {
  login: [
    { key: "name", label: "Name", placeholder: "GitHub, bank…" },
    { key: "url", label: "URL", placeholder: "https://…" },
    { key: "username", label: "Username / email" },
    { key: "password", label: "Password", secret: true },
    { key: "notes", label: "Notes", multiline: true },
  ],
  apikey: [
    { key: "name", label: "Label", placeholder: "OpenRouter prod key…" },
    { key: "key", label: "Key / token", secret: true },
    { key: "expiresAt", label: "Expires (YYYY-MM-DD, optional)" },
    { key: "notes", label: "Notes", multiline: true },
  ],
  note: [
    { key: "name", label: "Title" },
    { key: "body", label: "Content", multiline: true },
  ],
  pem: [
    { key: "name", label: "Server label", placeholder: "prod-odoo-1" },
    { key: "host", label: "Host / IP" },
    { key: "sshUser", label: "SSH user", placeholder: "ubuntu" },
    { key: "sshCommand", label: "SSH command", placeholder: "ssh -i key.pem ubuntu@1.2.3.4" },
    { key: "pemContent", label: "PEM key content", secret: true, multiline: true },
    { key: "notes", label: "Notes", multiline: true },
  ],
};

function copyWithAutoClear(value: string, label: string) {
  navigator.clipboard.writeText(value).then(() => {
    toast.success(`${label} copied — clipboard clears in 30s`);
    setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText();
        if (current === value) await navigator.clipboard.writeText("");
      } catch {
        // clipboard read may be blocked when tab unfocused; best effort
      }
    }, 30_000);
  });
}

export function VaultClient({
  initialized,
  salt,
  keyCheck,
  iterations,
  items,
}: {
  initialized: boolean;
  salt: string | null;
  keyCheck: string | null;
  iterations: number;
  items: RawItem[];
}) {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    (async () => {
      if (initialized && keyCheck) {
        const stored = await loadSessionKey();
        if (stored && (await verifyKeyCheck(stored, keyCheck))) setKey(stored);
      }
      setCheckingSession(false);
    })();
  }, [initialized, keyCheck]);

  if (checkingSession) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Opening vault…</p>;
  }
  if (!initialized) return <SetupView />;
  if (!key)
    return (
      <UnlockView
        salt={salt!}
        keyCheck={keyCheck!}
        iterations={iterations}
        onUnlock={setKey}
      />
    );
  return <UnlockedView vaultKey={key} items={items} onLock={() => { clearSessionKey(); setKey(null); }} />;
}

function SetupView() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSetup(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 10) return toast.error("Use at least 10 characters");
    if (pw !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      const salt = newSalt();
      const key = await deriveKey(pw, salt, PBKDF2_ITERATIONS);
      const check = await makeKeyCheck(key);
      const res = await setupVault(salt, check);
      if (res.error) return toast.error(res.error);
      await storeSessionKey(key);
      location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div className="space-y-2 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
        <h1 className="text-xl font-semibold">Set up your vault</h1>
        <p className="text-sm text-muted-foreground">
          Everything is encrypted in your browser with a master password before
          it ever reaches the database.
        </p>
      </div>
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
        <strong>No recovery.</strong> If you forget the master password, the
        vault contents are permanently unreadable — by design. Choose something
        you will not forget.
      </div>
      <form onSubmit={onSetup} className="space-y-3">
        <input
          type="password"
          placeholder="Master password (min 10 chars)"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="password"
          placeholder="Confirm master password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          disabled={busy || pw.length < 10 || pw !== confirm}
          className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Deriving key…" : "Create vault"}
        </button>
      </form>
    </div>
  );
}

function UnlockView({
  salt,
  keyCheck,
  iterations,
  onUnlock,
}: {
  salt: string;
  keyCheck: string;
  iterations: number;
  onUnlock: (k: CryptoKey) => void;
}) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const key = await deriveKey(pw, salt, iterations);
      if (!(await verifyKeyCheck(key, keyCheck))) {
        toast.error("Wrong master password");
        return;
      }
      await storeSessionKey(key);
      onUnlock(key);
    } finally {
      setBusy(false);
      setPw("");
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-16 text-center">
      <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Vault locked</h1>
        <p className="text-sm text-muted-foreground">
          Enter your master password. Stays unlocked until this tab closes.
        </p>
      </div>
      <form onSubmit={unlock} className="space-y-3">
        <input
          autoFocus
          type="password"
          placeholder="Master password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          disabled={busy || !pw}
          className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

function UnlockedView({
  vaultKey,
  items,
  onLock,
}: {
  vaultKey: CryptoKey;
  items: RawItem[];
  onLock: () => void;
}) {
  const [decrypted, setDecrypted] = useState<DecryptedItem[] | null>(null);
  const [tab, setTab] = useState<ItemType>("login");
  const [editing, setEditing] = useState<DecryptedItem | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const out: DecryptedItem[] = [];
      for (const item of items) {
        try {
          const blob = JSON.parse(item.data) as EncryptedBlob;
          const fields = JSON.parse(await decrypt(vaultKey, blob));
          out.push({ id: item.id, type: item.type, fields, updatedAt: item.updatedAt });
        } catch {
          // skip undecryptable items rather than blanking the vault
        }
      }
      setDecrypted(out);
    })();
  }, [items, vaultKey]);

  const visible = useMemo(
    () => (decrypted ?? []).filter((i) => i.type === tab),
    [decrypted, tab]
  );

  async function save(type: ItemType, id: string | null, fields: Record<string, string>) {
    const blob = await encrypt(vaultKey, JSON.stringify(fields));
    const data = JSON.stringify(blob);
    startTransition(async () => {
      if (id) await updateVaultItem(id, data);
      else await createVaultItem(type, data);
      setEditing(null);
      toast.success("Saved (encrypted)");
    });
  }

  if (!decrypted)
    return <p className="py-16 text-center text-sm text-muted-foreground">Decrypting…</p>;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h1 className="text-xl font-semibold tracking-tight">Vault</h1>
        </div>
        <button
          onClick={onLock}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <Lock className="h-3.5 w-3.5" /> Lock now
        </button>
      </header>

      <div className="flex gap-1 overflow-x-auto">
        {(Object.keys(TYPE_META) as ItemType[]).map((t) => {
          const Icon = TYPE_META[t].icon;
          const count = (decrypted ?? []).filter((i) => i.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
                tab === t
                  ? "bg-accent font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {TYPE_META[t].label}
              <span className="text-xs text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setEditing("new")}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Add {TYPE_META[tab].label.toLowerCase().replace(/s$/, "")}
      </button>

      {editing && (
        <ItemForm
          type={tab}
          item={editing === "new" ? null : editing}
          busy={pending}
          onCancel={() => setEditing(null)}
          onSave={(fields) =>
            save(tab, editing === "new" ? null : editing.id, fields)
          }
        />
      )}

      <div className="space-y-2">
        {visible.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onEdit={() => setEditing(item)}
            onDelete={() => {
              if (confirm(`Delete "${item.fields.name || "item"}" permanently?`))
                startTransition(() => deleteVaultItem(item.id));
            }}
          />
        ))}
        {visible.length === 0 && !editing && (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        )}
      </div>
    </div>
  );
}

function ItemForm({
  type,
  item,
  busy,
  onSave,
  onCancel,
}: {
  type: ItemType;
  item: DecryptedItem | null;
  busy: boolean;
  onSave: (fields: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>(
    item?.fields ?? {}
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(fields);
      }}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      {TYPE_FIELDS[type].map((f) => (
        <div key={f.key} className="space-y-1">
          <label className="flex items-center justify-between text-xs text-muted-foreground">
            {f.label}
            {f.key === "password" && (
              <button
                type="button"
                onClick={() =>
                  setFields((x) => ({ ...x, password: generatePassword() }))
                }
                className="inline-flex items-center gap-1 text-[11px] hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" /> Generate
              </button>
            )}
          </label>
          {f.multiline ? (
            <textarea
              value={fields[f.key] ?? ""}
              onChange={(e) =>
                setFields((x) => ({ ...x, [f.key]: e.target.value }))
              }
              rows={f.key === "pemContent" ? 6 : 3}
              placeholder={f.placeholder}
              className={cn(
                "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                f.secret && "font-mono text-xs"
              )}
            />
          ) : (
            <input
              type={f.secret ? "password" : "text"}
              value={fields[f.key] ?? ""}
              onChange={(e) =>
                setFields((x) => ({ ...x, [f.key]: e.target.value }))
              }
              placeholder={f.placeholder}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <button
          disabled={busy || !(fields.name ?? "").trim()}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Encrypting…" : "Save encrypted"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-md border border-border px-4 text-sm hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: DecryptedItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [now] = useState(() => Date.now());
  const f = item.fields;

  const secretKeys = TYPE_FIELDS[item.type]
    .filter((x) => x.secret)
    .map((x) => x.key);
  const copyKey =
    item.type === "login" ? "password" : item.type === "apikey" ? "key" : null;

  const expiringSoon =
    item.type === "apikey" && f.expiresAt
      ? (new Date(f.expiresAt).getTime() - now) / 86400000
      : null;

  return (
    <div className="group rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-sm font-medium">
          {f.name || "(unnamed)"}
        </span>
        {expiringSoon !== null && expiringSoon <= 30 && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              expiringSoon <= 0
                ? "bg-red-500/15 text-red-500"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}
          >
            {expiringSoon <= 0
              ? "expired"
              : `expires in ${Math.ceil(expiringSoon)}d`}
          </span>
        )}
        {copyKey && f[copyKey] && (
          <button
            onClick={() =>
              copyWithAutoClear(f[copyKey], item.type === "login" ? "Password" : "Key")
            }
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Copy secret"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="hidden rounded p-1.5 text-muted-foreground hover:text-red-500 group-hover:block"
          aria-label="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
        {item.type === "login" && (
          <>
            {f.url && <p className="truncate">{f.url}</p>}
            {f.username && (
              <p className="flex items-center gap-1.5">
                {f.username}
                <button
                  onClick={() => navigator.clipboard.writeText(f.username)}
                  className="hover:text-foreground"
                  aria-label="Copy username"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </p>
            )}
          </>
        )}
        {item.type === "pem" && (
          <>
            {f.host && <p>{f.sshUser ? `${f.sshUser}@` : ""}{f.host}</p>}
            {f.sshCommand && (
              <p className="flex items-center gap-1.5 font-mono">
                <span className="truncate">{f.sshCommand}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(f.sshCommand)}
                  className="shrink-0 hover:text-foreground"
                  aria-label="Copy SSH command"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </p>
            )}
          </>
        )}
        {secretKeys.map(
          (k) =>
            f[k] && (
              <p key={k} className="flex items-center gap-1.5 font-mono">
                <span className="truncate">
                  {revealed[k]
                    ? k === "pemContent"
                      ? f[k].slice(0, 60) + "…"
                      : f[k]
                    : "••••••••••••"}
                </span>
                <button
                  onClick={() => setRevealed((r) => ({ ...r, [k]: !r[k] }))}
                  className="shrink-0 hover:text-foreground"
                  aria-label="Toggle reveal"
                >
                  {revealed[k] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                {k === "pemContent" && (
                  <button
                    onClick={() => copyWithAutoClear(f[k], "PEM key")}
                    className="shrink-0 hover:text-foreground"
                    aria-label="Copy PEM"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </p>
            )
        )}
        {f.notes && <p className="whitespace-pre-wrap">{f.notes}</p>}
        {item.type === "note" && f.body && (
          <p className="whitespace-pre-wrap text-foreground/80">{f.body}</p>
        )}
      </div>
    </div>
  );
}
