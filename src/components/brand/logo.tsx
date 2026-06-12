import { cn } from "@/lib/utils";

// 2×2 grid of rounded squares — diagonal cells full brightness, off-diagonal dimmed.
// The two bright cells (top-left + bottom-right) create a subtle flow through the grid.

function GridCells() {
  return (
    <>
      <rect x="3" y="3" width="12" height="12" rx="2.5" fill="#818cf8" />
      <rect x="17" y="3" width="12" height="12" rx="2.5" fill="#818cf8" fillOpacity="0.35" />
      <rect x="3" y="17" width="12" height="12" rx="2.5" fill="#818cf8" fillOpacity="0.35" />
      <rect x="17" y="17" width="12" height="12" rx="2.5" fill="#818cf8" />
    </>
  );
}

/** Bare grid symbol — no background. For sidebar, inline use. */
export function LogoIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <GridCells />
    </svg>
  );
}

/** Grid symbol on a dark rounded-rect badge. For auth pages, app icons. */
export function LogoIconBadge({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="7" fill="#18181b" />
      <GridCells />
    </svg>
  );
}

/** Icon + "Life Grid" wordmark. For sidebar, header. */
export function LogoMark({
  iconSize = 20,
  className,
  textClassName,
}: {
  iconSize?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoIcon size={iconSize} />
      <span className={cn("font-semibold tracking-tight", textClassName)}>Life Grid</span>
    </div>
  );
}
