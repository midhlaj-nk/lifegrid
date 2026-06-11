"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";

interface Story {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
}

const CACHE_KEY = "ai-news-v1";
const TTL = 30 * 60 * 1000;

export function NewsWidget() {
  const [stories, setStories] = useState<Story[] | null>(null);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.fetchedAt < TTL) {
        setStories(cached.stories);
        return;
      }
    } catch {
      // refetch
    }
    fetch(
      "https://hn.algolia.com/api/v1/search?query=AI&tags=story&numericFilters=points>40&hitsPerPage=6"
    )
      .then((r) => r.json())
      .then((d) => {
        const stories = (d.hits ?? []).map((h: Story) => ({
          objectID: h.objectID,
          title: h.title,
          url: h.url,
          points: h.points,
        }));
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ stories, fetchedAt: Date.now() })
        );
        setStories(stories);
      })
      .catch(() => setStories([]));
  }, []);

  if (stories === null)
    return <p className="text-sm text-muted-foreground">Loading news…</p>;
  if (!stories.length)
    return <p className="text-sm text-muted-foreground">No news right now.</p>;

  return (
    <div className="space-y-1.5">
      {stories.map((s) => (
        <a
          key={s.objectID}
          href={s.url ?? `https://news.ycombinator.com/item?id=${s.objectID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent"
        >
          <Newspaper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate group-hover:whitespace-normal">
            {s.title}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            {s.points}▲ <ExternalLink className="h-3 w-3" />
          </span>
        </a>
      ))}
    </div>
  );
}
