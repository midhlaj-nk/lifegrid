"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setAllowSignups } from "@/actions/admin";

export function AdminSettings({ allowSignups }: { allowSignups: boolean }) {
  const [on, setOn] = useState(allowSignups);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await setAllowSignups(next);
      } catch (e) {
        setOn(!next); // revert
        toast.error((e as Error).message ?? "Failed to update setting");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Allow new sign-ups</p>
        <p className="text-xs text-muted-foreground">
          {on
            ? "Anyone can create an account right now."
            : "Registration is closed. Only you can sign in."}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        disabled={pending}
        onClick={toggle}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          on ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            on ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
