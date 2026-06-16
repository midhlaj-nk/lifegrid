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
  const prevPath = useRef(pathname);

  useEffect(() => {
    const el = ref.current;
    if (!el || prevPath.current === pathname) return;
    prevPath.current = pathname;
    el.classList.remove("page-enter");
    void el.offsetHeight;
    el.classList.add("page-enter");
  }, [pathname]);

  return (
    <div ref={ref} className={cn("page-enter", className)}>
      {children}
    </div>
  );
}
