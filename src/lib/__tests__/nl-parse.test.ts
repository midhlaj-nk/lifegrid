import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "@/lib/nl-parse";

// fixed "now": Thursday 2026-06-11
const NOW = new Date("2026-06-11T10:00:00");

describe("parseQuickAdd", () => {
  it("parses date, time, tag, priority, monthly recurrence", () => {
    const r = parseQuickAdd("pay rent tomorrow 6pm #personal !high every month", NOW);
    expect(r.title).toBe("pay rent");
    expect(r.dueDate).toBe("2026-06-12");
    expect(r.dueTime).toBe("18:00");
    expect(r.priority).toBe(1);
    expect(r.tagNames).toEqual(["personal"]);
    expect(r.recurrence).toEqual({ freq: "monthly", interval: 1 });
  });

  it("parses weekday lists into weekly recurrence", () => {
    const r = parseQuickAdd("gym every mon,wed,fri 7am", NOW);
    expect(r.title).toBe("gym");
    expect(r.dueTime).toBe("07:00");
    expect(r.recurrence).toEqual({
      freq: "weekly",
      interval: 1,
      byWeekday: [1, 3, 5],
    });
  });

  it("parses bare weekday as next occurrence", () => {
    const r = parseQuickAdd("submit report friday !p1 #work", NOW);
    expect(r.dueDate).toBe("2026-06-12"); // next Friday after Thu 11th
    expect(r.priority).toBe(1);
    expect(r.tagNames).toEqual(["work"]);
  });

  it("parses day-month and rolls past dates to next year", () => {
    expect(parseQuickAdd("call mom 15 aug", NOW).dueDate).toBe("2026-08-15");
    expect(parseQuickAdd("call mom 15 jan", NOW).dueDate).toBe("2027-01-15");
  });

  it("daily keyword starts today", () => {
    const r = parseQuickAdd("water plants daily", NOW);
    expect(r.recurrence).toEqual({ freq: "daily", interval: 1 });
    expect(r.dueDate).toBe("2026-06-11");
  });

  it("plain text has no extras", () => {
    const r = parseQuickAdd("think about life", NOW);
    expect(r).toEqual({
      title: "think about life",
      dueDate: null,
      dueTime: null,
      priority: 4,
      tagNames: [],
      recurrence: null,
    });
  });
});
