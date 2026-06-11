import { describe, expect, it } from "vitest";
import {
  nextOccurrence,
  parseRecurrence,
  describeRecurrence,
} from "@/lib/recurrence";

describe("recurrence", () => {
  it("daily advances by interval", () => {
    expect(nextOccurrence({ freq: "daily", interval: 1 }, "2026-06-11")).toBe("2026-06-12");
    expect(nextOccurrence({ freq: "daily", interval: 3 }, "2026-06-11")).toBe("2026-06-14");
  });

  it("weekly with byWeekday finds next listed day", () => {
    // 2026-06-11 is Thursday; next of Mon/Wed/Fri is Friday 12th
    expect(
      nextOccurrence(
        { freq: "weekly", interval: 1, byWeekday: [1, 3, 5] },
        "2026-06-11"
      )
    ).toBe("2026-06-12");
  });

  it("monthly clamps to short months", () => {
    expect(
      nextOccurrence({ freq: "monthly", interval: 1, byMonthDay: 31 }, "2026-05-31")
    ).toBe("2026-06-30");
  });

  it("parseRecurrence rejects junk", () => {
    expect(parseRecurrence(null)).toBeNull();
    expect(parseRecurrence("not json")).toBeNull();
    expect(parseRecurrence('{"x":1}')).toBeNull();
  });

  it("describes presets", () => {
    expect(describeRecurrence({ freq: "daily", interval: 1 })).toBe("daily");
    expect(
      describeRecurrence({ freq: "weekly", interval: 1, byWeekday: [1, 3, 5] })
    ).toBe("weekly on Mon, Wed, Fri");
  });
});
