/**
 * Minimal CSV encoding for export routes. Values containing commas, quotes,
 * or newlines are quoted; quotes are doubled per RFC 4180.
 */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (v: string | number | null): string => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}
