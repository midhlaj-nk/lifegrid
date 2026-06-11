export function formatINR(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  const formatted = rupees.toLocaleString("en-IN");
  return paise
    ? `${sign}₹${formatted}.${String(paise).padStart(2, "0")}`
    : `${sign}₹${formatted}`;
}

/** "1,234.56" | "1234" -> paise int. NaN-safe. */
export function toMinor(input: string | number): number {
  const n =
    typeof input === "number" ? input : parseFloat(String(input).replace(/,/g, ""));
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // yyyy-MM
}
