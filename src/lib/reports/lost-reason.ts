import type { LostReasonBucket } from "./types";

// Ordered: the FIRST matching bucket wins, so put more specific patterns
// ("competitor") before broader ones ("price") when text could match both.
const BUCKETS: { label: string; patterns: RegExp[] }[] = [
  { label: "Competitor", patterns: [/competitor|rival|another (vendor|agency|provider)|went with/i] },
  { label: "Price", patterns: [/price|pricing|expensive|cost|budget|too (high|much)|cheaper/i] },
  { label: "Went in-house", patterns: [/in.?house|internally|build.*(themselves|own)|diy/i] },
  { label: "Timing", patterns: [/timing|not (now|ready)|next (year|quarter)|revisit|postpone|delay/i] },
  { label: "No decision", patterns: [/no decision|went (quiet|cold)|ghost|no response|stalled|never (replied|responded)/i] },
];

export function bucketLostReason(reason: string | null | undefined): string {
  const text = (reason ?? "").trim();
  if (!text) return "Not recorded";
  for (const b of BUCKETS) {
    if (b.patterns.some((p) => p.test(text))) return b.label;
  }
  return "Other";
}

export function bucketLostReasons(reasons: (string | null | undefined)[]): LostReasonBucket[] {
  const counts = new Map<string, number>();
  for (const r of reasons) {
    const label = bucketLostReason(r);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
