"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("animate-fade-up");
    void el.offsetHeight; // force reflow so browser re-fires the animation
    el.classList.add("animate-fade-up");
  }, [pathname]);

  return (
    <div ref={ref} className={cn("animate-fade-up", className)}>
      {children}
    </div>
  );
}
