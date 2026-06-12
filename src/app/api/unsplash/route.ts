import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const [row] = await db.select({ unsplashAccessKey: aiSettings.unsplashAccessKey })
    .from(aiSettings)
    .where(eq(aiSettings.userId, user.id));

  const key = row?.unsplashAccessKey || process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ error: "UNSPLASH_ACCESS_KEY not configured" }, { status: 503 });

  const query = req.nextUrl.searchParams.get("q") || "nature";
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${key}` }, next: { revalidate: 300 } }
  );
  if (!res.ok) return NextResponse.json({ error: "Unsplash error" }, { status: res.status });

  const data = await res.json();
  const photos = (data.results as Array<{ id: string; urls: { regular: string; small: string }; user: { name: string } }>).map((p) => ({
    id: p.id,
    regular: p.urls.regular,
    small: p.urls.small,
    credit: p.user.name,
  }));
  return NextResponse.json({ photos });
}
