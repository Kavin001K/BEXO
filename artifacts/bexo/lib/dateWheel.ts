/** First day of month ISO for experience-style dates */
export function toIsoFirstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export function parseIsoMonth(iso: string | undefined | null): Date {
  if (!iso || iso.length < 7) return new Date(2020, 0, 1);
  const [ys, ms] = iso.split("-");
  const y = parseInt(ys ?? "2020", 10);
  const m = parseInt(ms ?? "1", 10);
  if (isNaN(y) || isNaN(m)) return new Date(2020, 0, 1);
  return new Date(y, Math.min(12, Math.max(1, m)) - 1, 1);
}

export function formatMonthYear(iso: string | undefined | null): string {
  if (!iso || iso.length < 7) return "";
  const d = parseIsoMonth(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Normalize stored experience dates to `YYYY-MM-01` for wheel pickers */
export function normalizeExperienceIso(s: string | null | undefined): string {
  if (!s || !String(s).trim()) return "";
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) return toIsoFirstOfMonth(new Date(parsed));
  const guess = new Date(`${t.replace(/-/g, " ")} 1`);
  if (!Number.isNaN(guess.getTime())) return toIsoFirstOfMonth(guess);
  const monYear = t.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monYear) {
    const d = new Date(`${monYear[1]} 1, ${monYear[2]}`);
    if (!Number.isNaN(d.getTime())) return toIsoFirstOfMonth(d);
  }
  return "";
}
