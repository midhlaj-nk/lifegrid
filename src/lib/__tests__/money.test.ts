import { describe, expect, it } from "vitest";
import { formatINR, toMinor } from "@/lib/money";

describe("money", () => {
  it("formats indian grouping", () => {
    expect(formatINR(123456789)).toBe("₹12,34,567.89");
    expect(formatINR(100000)).toBe("₹1,000");
    expect(formatINR(-5050)).toBe("-₹50.50");
    expect(formatINR(0)).toBe("₹0");
  });

  it("parses strings to paise", () => {
    expect(toMinor("1,234.56")).toBe(123456);
    expect(toMinor("450")).toBe(45000);
    expect(toMinor("0.01")).toBe(1);
    expect(toMinor("garbage")).toBe(0);
    expect(toMinor(99.99)).toBe(9999);
  });
});
