"use client";

// next-auth `useSession` shim backed by Better Auth, so ported
// worklog-daily pages keep their original shape untouched.
import { useSession as useBetterSession } from "@/lib/auth-client";

export function useSession() {
  const { data, isPending } = useBetterSession();
  return {
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
  };
}
