"use client";
import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function ShortcutsSettings({ initialToken }: { initialToken: string }) {
  const [token, setToken] = useState(initialToken);
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();

  async function regen() {
    startTransition(async () => {
      const res = await fetch("/api/shortcuts", { method: "POST" });
      const data = await res.json();
      setToken(data.token);
      toast.success("Token regenerated");
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Use this token to connect the iOS Shortcuts app to your life-os.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono truncate">
          {show ? token : "•".repeat(24)}
        </code>
        <button
          onClick={() => setShow((v) => !v)}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
          aria-label={show ? "Hide token" : "Show token"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(token);
            toast.success("Copied");
          }}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
          aria-label="Copy token"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={regen}
          disabled={pending}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent disabled:opacity-50"
          aria-label="Regenerate token"
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
        <p className="font-medium">Available Shortcuts endpoints:</p>
        <ul className="space-y-1 text-muted-foreground text-xs font-mono">
          <li>POST /api/shortcuts/task — Create task (body: {"{"}"title","dueDate","note"{"}"} )</li>
          <li>GET  /api/shortcuts/today — Today&apos;s tasks</li>
          <li>GET  /api/shortcuts/notes — Recent notes</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Set Authorization header:{" "}
          <code className="bg-muted px-1 rounded">Bearer &lt;token&gt;</code>
        </p>
      </div>
    </div>
  );
}
