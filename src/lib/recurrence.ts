import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";

export interface Recurrence {
  freq: "daily" | "weekly" | "monthly";
  interval: number; // every N units
  byWeekday?: number[]; // 0=Sun..6=Sat, for weekly
  byMonthDay?: number; // 1..31, for monthly
}

export function parseRecurrence(raw: string | null): Recurrence | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Recurrence;
    if (!r.freq || !r.interval) return null;
    return r;
  } catch {
    return null;
  }
}

/** Next due date strictly after `fromDate` (yyyy-MM-dd). */
export function nextOccurrence(rec: Recurrence, fromDate: string): string {
  const from = parseISO(fromDate);

  if (rec.freq === "daily") {
    return format(addDays(from, rec.interval), "yyyy-MM-dd");
  }

  if (rec.freq === "weekly") {
    const days = rec.byWeekday?.length
      ? [...rec.byWeekday].sort()
      : [from.getDay()];
    // scan forward day by day (bounded), respecting interval weeks
    for (let i = 1; i <= 7 * rec.interval + 7; i++) {
      const cand = addDays(from, i);
      if (days.includes(cand.getDay())) {
        // for interval > 1, only weeks at the right cadence count
        if (rec.interval === 1) return format(cand, "yyyy-MM-dd");
        const weeksDiff = Math.floor(i / 7);
        if (weeksDiff % rec.interval === 0 || days.length > 1)
          return format(cand, "yyyy-MM-dd");
      }
    }
    return format(addWeeks(from, rec.interval), "yyyy-MM-dd");
  }

  // monthly
  const base = addMonths(from, rec.interval);
  if (rec.byMonthDay) {
    const y = base.getFullYear();
    const m = base.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const d = Math.min(rec.byMonthDay, lastDay);
    return format(new Date(y, m, d), "yyyy-MM-dd");
  }
  return format(base, "yyyy-MM-dd");
}

export function describeRecurrence(rec: Recurrence): string {
  const every = rec.interval > 1 ? `every ${rec.interval} ` : "every ";
  if (rec.freq === "daily") return rec.interval > 1 ? `${every}days` : "daily";
  if (rec.freq === "weekly") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = rec.byWeekday?.length
      ? ` on ${rec.byWeekday.map((d) => names[d]).join(", ")}`
      : "";
    return (rec.interval > 1 ? `${every}weeks` : "weekly") + days;
  }
  const dom = rec.byMonthDay ? ` on day ${rec.byMonthDay}` : "";
  return (rec.interval > 1 ? `${every}months` : "monthly") + dom;
}
