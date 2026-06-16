"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CreditCard, Inbox, Menu, Plus, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickTransactionSheet } from "./quick-transaction-sheet";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  null, // center FAB slot
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
];

export function MobileBottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const [fabOpen, setFabOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close speed-dial on outside tap
  useEffect(() => {
    if (!fabOpen) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [fabOpen]);

  function handleTask() {
    setFabOpen(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
  }

  function handleTransaction() {
    setFabOpen(false);
    setTxOpen(true);
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 md:hidden">
        <div
          className="flex items-center border-t border-border/60"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {NAV_ITEMS.map((item, i) => {
            if (!item) {
              // Center FAB speed-dial
              return (
                <div key="fab" ref={fabRef} className="relative flex flex-1 items-center justify-center">
                  {/* Speed-dial options — appear above FAB */}
                  <div
                    className={cn(
                      "absolute bottom-full mb-3 flex flex-col items-center gap-2 transition-all duration-200",
                      fabOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
                    )}
                  >
                    <SpeedDialOption
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Transaction"
                      delay={60}
                      visible={fabOpen}
                      onClick={handleTransaction}
                    />
                    <SpeedDialOption
                      icon={<Zap className="h-4 w-4" />}
                      label="Task"
                      delay={0}
                      visible={fabOpen}
                      onClick={handleTask}
                    />
                  </div>

                  {/* FAB */}
                  <button
                    onClick={() => setFabOpen((v) => !v)}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 active:scale-90",
                      fabOpen && "rotate-45 shadow-xl"
                    )}
                    aria-label={fabOpen ? "Close menu" : "Quick add"}
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              );
            }

            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setFabOpen(false)}
                aria-current={active ? "page" : undefined}
              className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-4 text-[10px] font-medium transition-colors active:bg-accent/50",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[22px] w-[22px] transition-transform duration-100",
                    active && "scale-110"
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {item.label}
              </Link>
            );
          })}

          {/* More */}
          <button
            onClick={() => { setFabOpen(false); onMenu(); }}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium text-muted-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-[22px] w-[22px]" strokeWidth={1.75} />
            More
          </button>
        </div>
      </nav>

      <QuickTransactionSheet open={txOpen} onClose={() => setTxOpen(false)} />
    </>
  );
}

function SpeedDialOption({
  icon,
  label,
  delay,
  visible,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  delay: number;
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition-all duration-200",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  );
}
