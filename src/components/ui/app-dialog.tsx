"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type Confirm = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm>(() => Promise.resolve(false));

export function useConfirm() {
  return useContext(ConfirmContext);
}

/** Mount once near the app root; replaces window.confirm with a styled dialog. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(null);

  const confirm = useCallback<Confirm>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-sm rounded-t-xl border border-border bg-background p-4 shadow-lg sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-sm font-semibold">{opts.title}</h2>
            {opts.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {opts.description}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="h-9 rounded-md border border-border px-4 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                autoFocus
                onClick={() => close(true)}
                className={
                  opts.danger
                    ? "h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
                    : "h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                }
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/** Generic small modal shell shared by edit dialogs. */
export function AppModal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-t-xl border border-border bg-background p-4 shadow-lg sm:rounded-xl ${wide ? "max-w-lg" : "max-w-sm"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
