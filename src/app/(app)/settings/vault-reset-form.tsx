"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  deriveKey,
  encrypt,
  decrypt,
  newSalt,
  makeKeyCheck,
  verifyKeyCheck,
  clearSessionKey,
  PBKDF2_ITERATIONS,
  type EncryptedBlob,
} from "@/lib/vault-crypto";
import { getVaultMeta, listVaultItems, replaceVaultKey, nukeVault } from "@/actions/vault";

type Step = "unlock" | "newpass" | "done" | "nuked";

function PwInput({
  value,
  onChange,
  placeholder,
  id,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function VaultResetForm({ hasVault }: { hasVault: boolean }) {
  const [step, setStep] = useState<Step>("unlock");
  const [isPending, startTransition] = useTransition();

  // unlock step
  const [currentPw, setCurrentPw] = useState("");
  // stored after unlock
  const [decryptedItems, setDecryptedItems] = useState<{ id: string; plain: string }[]>([]);

  // new password step
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // nuke confirm
  const [nukeInput, setNukeInput] = useState("");
  const [showNuke, setShowNuke] = useState(false);

  if (!hasVault) {
    return (
      <p className="text-sm text-muted-foreground">
        No vault set up yet. Visit the{" "}
        <a href="/vault" className="text-primary underline-offset-2 hover:underline">
          Vault
        </a>{" "}
        page to create one.
      </p>
    );
  }

  async function handleUnlock() {
    if (!currentPw) return;
    startTransition(async () => {
      try {
        const meta = await getVaultMeta();
        if (!meta) { toast.error("Vault not initialised"); return; }
        const key = await deriveKey(currentPw, meta.salt, PBKDF2_ITERATIONS);
        const valid = await verifyKeyCheck(key, meta.keyCheck);
        if (!valid) { toast.error("Wrong master password"); return; }

        const rows = await listVaultItems();
        const decrypted = await Promise.all(
          rows.map(async (row) => {
            const blob = JSON.parse(row.data) as EncryptedBlob;
            const plain = await decrypt(key, blob);
            return { id: row.id, plain };
          })
        );
        setDecryptedItems(decrypted);
        setStep("newpass");
      } catch {
        toast.error("Failed to unlock vault");
      }
    });
  }

  async function handleChangePassword() {
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    startTransition(async () => {
      try {
        const salt = newSalt();
        const newKey = await deriveKey(newPw, salt, PBKDF2_ITERATIONS);
        const keyCheck = await makeKeyCheck(newKey);

        const reEncrypted = await Promise.all(
          decryptedItems.map(async ({ id, plain }) => {
            const blob = await encrypt(newKey, plain);
            return { id, data: JSON.stringify(blob) };
          })
        );

        const res = await replaceVaultKey(salt, keyCheck, reEncrypted);
        if (res?.error) { toast.error(res.error); return; }

        clearSessionKey();
        setStep("done");
        toast.success("Vault password changed");
      } catch {
        toast.error("Failed to re-encrypt vault");
      }
    });
  }

  async function handleNuke() {
    if (nukeInput !== "DELETE") return;
    startTransition(async () => {
      try {
        await nukeVault();
        clearSessionKey();
        setShowNuke(false);
        setStep("nuked");
        toast.success("Vault wiped");
      } catch {
        toast.error("Failed to wipe vault");
      }
    });
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <ShieldCheck className="h-10 w-10 text-green-500" />
        <p className="font-medium">Vault password changed</p>
        <p className="text-sm text-muted-foreground">
          Your vault is re-encrypted with the new password. The previous session key has been
          cleared — you&apos;ll be asked to unlock on next vault visit.
        </p>
        <button
          onClick={() => { setStep("unlock"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Change again
        </button>
      </div>
    );
  }

  if (step === "nuked") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="font-medium">Vault wiped</p>
        <p className="text-sm text-muted-foreground">
          All vault data deleted. Visit the{" "}
          <a href="/vault" className="text-primary underline-offset-2 hover:underline">
            Vault
          </a>{" "}
          page to set up a new vault with a fresh master password.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1 — unlock with current password */}
      {step === "unlock" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="current-pw" className="mb-1.5 block text-sm font-medium">
              Current master password
            </label>
            <PwInput
              id="current-pw"
              value={currentPw}
              onChange={setCurrentPw}
              placeholder="Enter current vault password"
              disabled={isPending}
            />
          </div>
          <button
            onClick={handleUnlock}
            disabled={!currentPw || isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Unlocking…" : "Unlock vault"}
          </button>
        </div>
      )}

      {/* Step 2 — set new password */}
      {step === "newpass" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vault unlocked. {decryptedItems.length} item{decryptedItems.length !== 1 ? "s" : ""} will be
            re-encrypted with the new password.
          </p>
          <div>
            <label htmlFor="new-pw" className="mb-1.5 block text-sm font-medium">
              New master password
            </label>
            <PwInput
              id="new-pw"
              value={newPw}
              onChange={setNewPw}
              placeholder="At least 8 characters"
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="confirm-pw" className="mb-1.5 block text-sm font-medium">
              Confirm new password
            </label>
            <PwInput
              id="confirm-pw"
              value={confirmPw}
              onChange={setConfirmPw}
              placeholder="Repeat new password"
              disabled={isPending}
            />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            If you lose this password, your vault contents are unrecoverable. There is no reset.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setStep("unlock"); setCurrentPw(""); }}
              disabled={isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleChangePassword}
              disabled={!newPw || !confirmPw || isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Re-encrypting…" : "Change password"}
            </button>
          </div>
        </div>
      )}

      {/* Divider + nuke option */}
      <div className="border-t border-border pt-5">
        <h3 className="mb-1 text-sm font-semibold text-destructive">Danger zone</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Forgot your master password? Wipe all vault data and start fresh. This cannot be undone.
        </p>

        {!showNuke ? (
          <button
            onClick={() => setShowNuke(true)}
            className="rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            Wipe vault
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Type <span className="font-mono font-bold">DELETE</span> to confirm wipe
            </p>
            <input
              type="text"
              value={nukeInput}
              onChange={(e) => setNukeInput(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowNuke(false); setNukeInput(""); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleNuke}
                disabled={nukeInput !== "DELETE" || isPending}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {isPending ? "Wiping…" : "Wipe everything"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
