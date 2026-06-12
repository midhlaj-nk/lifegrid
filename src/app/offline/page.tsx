export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="text-4xl">📡</span>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Life Grid needs a connection for live data. Previously visited pages may
        still load — try going back, or reconnect and refresh.
      </p>
    </div>
  );
}
