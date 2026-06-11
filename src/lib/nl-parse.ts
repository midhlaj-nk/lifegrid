import { addDays, format, nextDay, type Day } from "date-fns";
import type { Recurrence } from "@/lib/recurrence";

export interface ParsedQuickAdd {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: number;
  tagNames: string[];
  recurrence: Recurrence | null;
}

const WEEKDAYS: Record<string, Day> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse natural-ish quick-add text:
 *   "pay rent tomorrow 6pm #personal !high every month"
 *   "gym every mon,wed,fri 7am"
 *   "submit report friday !p1 #work"
 *   "call mom 15 aug"
 */
export function parseQuickAdd(raw: string, now: Date = new Date()): ParsedQuickAdd {
  let text = ` ${raw.trim()} `;
  const result: ParsedQuickAdd = {
    title: "",
    dueDate: null,
    dueTime: null,
    priority: 4,
    tagNames: [],
    recurrence: null,
  };

  // #tags
  text = text.replace(/\s#([\w-]+)/g, (_, t) => {
    result.tagNames.push(t);
    return " ";
  });

  // priority: !p1..!p4 / !high !med !medium !low
  text = text.replace(/\s!(p[1-4]|high|med|medium|low)\b/gi, (_, p) => {
    const v = p.toLowerCase();
    result.priority =
      v === "p1" || v === "high" ? 1
      : v === "p2" || v === "med" || v === "medium" ? 2
      : v === "p3" || v === "low" ? 3
      : 4;
    return " ";
  });

  // recurrence: "every day|week|month", "every 2 weeks", "every mon,wed,fri", "daily|weekly|monthly"
  text = text.replace(
    /\severy\s+(\d+\s+)?(day|days|week|weeks|month|months|((?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*(?:\s*,\s*(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*)*))\b/gi,
    (_, n, unit) => {
      const interval = n ? parseInt(n) : 1;
      const u = unit.toLowerCase();
      if (u.startsWith("day")) result.recurrence = { freq: "daily", interval };
      else if (u.startsWith("week")) result.recurrence = { freq: "weekly", interval };
      else if (u.startsWith("month")) result.recurrence = { freq: "monthly", interval };
      else {
        const days = u
          .split(/\s*,\s*/)
          .map((d: string) => WEEKDAYS[d as keyof typeof WEEKDAYS] ?? WEEKDAYS[d.slice(0, 3) as keyof typeof WEEKDAYS])
          .filter((d: Day | undefined): d is Day => d !== undefined);
        if (days.length)
          result.recurrence = { freq: "weekly", interval: 1, byWeekday: days };
      }
      return " ";
    }
  );
  text = text.replace(/\s(daily|weekly|monthly)\b/gi, (_, w) => {
    const v = w.toLowerCase();
    result.recurrence = {
      freq: v === "daily" ? "daily" : v === "weekly" ? "weekly" : "monthly",
      interval: 1,
    };
    return " ";
  });

  // time: 6pm, 06:30, 6:30pm, 18:45
  text = text.replace(
    /\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi,
    (_, h, m, ap) => {
      let hour = parseInt(h) % 12;
      if (ap.toLowerCase() === "pm") hour += 12;
      result.dueTime = `${String(hour).padStart(2, "0")}:${m ?? "00"}`;
      return " ";
    }
  );
  if (!result.dueTime) {
    text = text.replace(/\s(?:at\s+)(\d{1,2}):(\d{2})\b/g, (_, h, m) => {
      result.dueTime = `${String(parseInt(h)).padStart(2, "0")}:${m}`;
      return " ";
    });
  }

  // dates
  const today = format(now, "yyyy-MM-dd");
  const apply = (d: string) => {
    result.dueDate = d;
    return " ";
  };

  text = text.replace(/\stoday\b/gi, () => apply(today));
  text = text.replace(/\stomorrow\b/gi, () =>
    apply(format(addDays(now, 1), "yyyy-MM-dd"))
  );
  text = text.replace(/\snext\s+week\b/gi, () =>
    apply(format(addDays(now, 7), "yyyy-MM-dd"))
  );
  // "next friday" / bare weekday
  text = text.replace(
    /\s(next\s+)?(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/gi,
    (_, next, wd) => {
      const day = WEEKDAYS[wd.toLowerCase()];
      let d = nextDay(now, day);
      if (next) d = addDays(d, 7);
      return apply(format(d, "yyyy-MM-dd"));
    }
  );
  // "15 aug" / "aug 15"
  text = text.replace(
    /\s(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi,
    (_, dd, mon) => {
      const m = MONTHS[mon.toLowerCase().slice(0, 3)];
      const year =
        new Date(now.getFullYear(), m, parseInt(dd)) < now
          ? now.getFullYear() + 1
          : now.getFullYear();
      return apply(format(new Date(year, m, parseInt(dd)), "yyyy-MM-dd"));
    }
  );
  text = text.replace(
    /\s(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/gi,
    (_, mon, dd) => {
      const m = MONTHS[mon.toLowerCase().slice(0, 3)];
      const year =
        new Date(now.getFullYear(), m, parseInt(dd)) < now
          ? now.getFullYear() + 1
          : now.getFullYear();
      return apply(format(new Date(year, m, parseInt(dd)), "yyyy-MM-dd"));
    }
  );
  // ISO date
  text = text.replace(/\s(\d{4}-\d{2}-\d{2})\b/g, (_, d) => apply(d));

  // time present but no date → today
  if (result.dueTime && !result.dueDate) result.dueDate = today;
  // recurrence but no start date → today
  if (result.recurrence && !result.dueDate) result.dueDate = today;

  result.title = text.replace(/\s+/g, " ").trim();
  return result;
}
