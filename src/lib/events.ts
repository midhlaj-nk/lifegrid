import { differenceInCalendarDays, parseISO } from "date-fns";

/** For yearly events, the next occurrence (this year or next). */
export function nextEventDate(dateStr: string, yearly: boolean): string {
  if (!yearly) return dateStr;
  const today = new Date();
  const base = parseISO(dateStr);
  const thisYear = new Date(today.getFullYear(), base.getMonth(), base.getDate());
  if (differenceInCalendarDays(thisYear, today) >= 0) {
    return thisYear.toISOString().split("T")[0];
  }
  const nextYear = new Date(
    today.getFullYear() + 1,
    base.getMonth(),
    base.getDate()
  );
  return nextYear.toISOString().split("T")[0];
}

export function daysUntil(dateStr: string): number {
  return differenceInCalendarDays(parseISO(dateStr), new Date());
}

export function countdownLabel(days: number): string {
  if (days === 0) return "D-day";
  if (days > 0) return `D-${days}`;
  return `${-days}d ago`;
}
