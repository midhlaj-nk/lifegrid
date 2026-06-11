"use client";

// next-auth `useSession` shim backed by Better Auth, so ported
// worklog-daily pages keep their original shape untouched.
import { useMemo } from "react";
import { useSession as useBetterSession } from "@/lib/auth-client";

export function useSession() {
  const { data, isPending } = useBetterSession();

  // Memoize: ported pages depend on [session] in effects — a fresh object
  // per render would re-fire them forever (fetch loop).
  return useMemo(
    () => ({
      data: data
        ? {
            user: {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              image: data.user.image ?? null,
            },
          }
        : null,
      status: isPending
        ? ("loading" as const)
        : data
          ? ("authenticated" as const)
          : ("unauthenticated" as const),
    }),
    [data, isPending]
  );
}
