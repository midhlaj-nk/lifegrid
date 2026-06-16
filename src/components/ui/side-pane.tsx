"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Drawer } from "vaul";
import { FullscreenPortal } from "@/components/shell/fullscreen-portal";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/**
 * Vaul-powered bottom sheet on mobile (swipe-to-dismiss, physics).
 * Right slide-in pane on desktop (md+).
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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer.Root
        open={open}
        onOpenChange={(v) => { if (!v) onClose(); }}
        shouldScaleBackground
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[91] flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl outline-none">
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1.5 w-12 rounded-full bg-border/80" />
            </div>
            {/* header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1 text-sm font-medium text-muted-foreground">
                {title}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-2.5 text-muted-foreground hover:bg-accent active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* scrollable content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-border px-4 py-3">{footer}</div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop: slide-in from right
  return (
    <DesktopPane open={open} onClose={onClose} title={title} footer={footer}>
      {children}
    </DesktopPane>
  );
}

function DesktopPane({
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <FullscreenPortal>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[90] bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
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
            className="rounded-md p-2.5 text-muted-foreground hover:bg-accent"
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
