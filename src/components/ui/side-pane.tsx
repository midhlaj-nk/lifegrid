"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { FullscreenPortal } from "@/components/shell/fullscreen-portal";
import { cn } from "@/lib/utils";

/**
 * Notion-style panel that slides in from the right. Portals to <body> so it
 * escapes the app shell's transformed PageTransition wrapper and overlays the
 * whole viewport. Closes on backdrop click or Escape.
 */
export function SidePane({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <FullscreenPortal>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[90] bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-[91] flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1 text-sm font-medium text-muted-foreground">
            {title}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="border-t border-border px-4 py-3">{footer}</div>
        )}
      </aside>
    </FullscreenPortal>
  );
}
