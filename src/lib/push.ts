import webpush from "web-push";

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  const subject = process.env.VAPID_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID env vars not set");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidInitialized = true;
}

export { webpush };

export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
) {
  ensureVapid();
  return webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    JSON.stringify(payload)
  );
}
