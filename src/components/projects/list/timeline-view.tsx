import Link from "next/link";
import { GanttChartSquare, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import type { TimelineProject } from "@/lib/projects/queries";
import { PROJECT_STATUS_ACCENT, type ProjectStatus } from "@/app/(app)/projects/schema";

const LABEL_W = 260;
const AXIS_H = 30;
const ROW_H = 44;
const PX_PER_DAY = 5.5;
const RANGE_PAD_DAYS = 14;
const MS_PER_DAY = 86_400_000;

const MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayOffset(from: Date, date: Date): number {
  return Math.round((date.getTime() - from.getTime()) / MS_PER_DAY);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/**
 * Per-project start→target bar on a month-scaled axis, today line, and
 * milestone dots (overdue = danger). Pure CSS/absolute-positioning — no
 * chart library. The label column is `position: sticky; left: 0` so it
 * stays put while the date axis scrolls horizontally; the whole thing
 * scrolls vertically together with the browser's normal scroll, so it
 * stays readable whether there are 5 rows or 50.
 */
export function TimelineView({ projects }: { projects: TimelineProject[] }) {
  if (projects.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <EmptyState
          icon={GanttChartSquare}
          title="No projects yet"
          description="Create a project to see it plotted against a timeline."
          action={
            <Link href="/projects/new" className="btn btn-primary">
              <Plus size={13} />
              New project
            </Link>
          }
        />
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allDates: Date[] = [today];
  for (const p of projects) {
    const start = parseDate(p.startDate);
    const end = parseDate(p.endDate);
    if (start) allDates.push(start);
    if (end) allDates.push(end);
    for (const m of p.milestones) {
      const due = parseDate(m.dueDate);
      if (due) allDates.push(due);
    }
  }

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())) - RANGE_PAD_DAYS * MS_PER_DAY);
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())) + RANGE_PAD_DAYS * MS_PER_DAY);
  const rangeStart = startOfMonth(minDate);
  const totalDays = dayOffset(rangeStart, maxDate);
  const totalWidth = Math.max(totalDays * PX_PER_DAY, 400);
  const totalHeight = AXIS_H + projects.length * ROW_H;

  const months: { x: number; label: string }[] = [];
  let cursor = rangeStart;
  while (cursor <= maxDate) {
    months.push({ x: dayOffset(rangeStart, cursor) * PX_PER_DAY, label: MONTH_FORMAT.format(cursor) });
    cursor = addMonths(cursor, 1);
  }

  const todayX = dayOffset(rangeStart, today) * PX_PER_DAY;

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ position: "relative", width: totalWidth + LABEL_W, minWidth: "100%" }}>
        {/* Month axis header row */}
        <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 3, background: "var(--paper)" }}>
          <div
            style={{
              width: LABEL_W,
              flexShrink: 0,
              position: "sticky",
              left: 0,
              zIndex: 4,
              background: "var(--paper)",
              borderBottom: "1px solid var(--hairline)",
              borderRight: "1px solid var(--hairline)",
            }}
          />
          <div style={{ position: "relative", width: totalWidth, height: AXIS_H, borderBottom: "1px solid var(--hairline)" }}>
            {months.map((m, i) => (
              <span
                key={i}
                className="t-mono"
                style={{
                  position: "absolute",
                  left: m.x + 6,
                  top: 8,
                  fontSize: 10.5,
                  color: "var(--ink-40)",
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Month gridlines + today line, spanning the full body height */}
        <div style={{ position: "absolute", top: AXIS_H, left: LABEL_W, width: totalWidth, height: totalHeight - AXIS_H, pointerEvents: "none" }}>
          {months.map((m, i) => (
            <div key={i} style={{ position: "absolute", left: m.x, top: 0, bottom: 0, width: 1, background: "var(--ink-10)" }} />
          ))}
          <div
            style={{
              position: "absolute",
              left: todayX,
              top: 0,
              bottom: 0,
              width: 1.5,
              background: "var(--magenta)",
              opacity: 0.6,
            }}
            title="Today"
          />
        </div>

        {/* Rows */}
        {projects.map((p) => {
          const start = parseDate(p.startDate);
          const end = parseDate(p.endDate);
          const barStart = start ?? end;
          const barEnd = end ?? start;
          const status = p.status as ProjectStatus;
          const barColor = PROJECT_STATUS_ACCENT[status] ?? "var(--ink-40)";

          return (
            <div key={p.id} style={{ display: "flex", height: ROW_H, borderBottom: "1px solid var(--ink-10)" }}>
              <div
                style={{
                  width: LABEL_W,
                  flexShrink: 0,
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  background: "var(--paper-pure)",
                  borderRight: "1px solid var(--hairline)",
                  padding: "6px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 2,
                  overflow: "hidden",
                }}
              >
                <Link
                  href={`/projects/${p.id}`}
                  className="truncate"
                  style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 500, textDecoration: "none" }}
                >
                  {p.name}
                </Link>
                <span className="truncate" style={{ fontSize: 10.5, color: "var(--ink-40)" }}>
                  {p.currentPhaseName ?? "Unphased"}
                </span>
              </div>

              <div style={{ position: "relative", width: totalWidth, height: ROW_H, flexShrink: 0 }}>
                {barStart && barEnd ? (
                  (() => {
                    const left = dayOffset(rangeStart, barStart) * PX_PER_DAY;
                    const rawWidth = dayOffset(barStart, barEnd) * PX_PER_DAY;
                    const width = Math.max(rawWidth, 6);
                    return (
                      <div
                        title={`${p.name} · ${p.startDate ?? "?"} → ${p.endDate ?? "?"}`}
                        style={{
                          position: "absolute",
                          left,
                          width,
                          top: "50%",
                          transform: "translateY(-50%)",
                          height: 7,
                          borderRadius: 4,
                          background: barColor,
                          opacity: p.status === "completed" ? 0.55 : 0.85,
                        }}
                      />
                    );
                  })()
                ) : (
                  <span
                    style={{
                      position: "absolute",
                      left: 4,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 10.5,
                      color: "var(--ink-4)",
                    }}
                  >
                    No dates set
                  </span>
                )}

                {p.milestones.map((m) => {
                  const due = parseDate(m.dueDate);
                  if (!due) return null;
                  const x = dayOffset(rangeStart, due) * PX_PER_DAY;
                  const tone = m.completedAt ? "var(--success)" : m.overdue ? "var(--danger)" : "var(--ink-60)";
                  return (
                    <div
                      key={m.id}
                      title={`${m.name} · ${m.dueDate}${m.overdue ? " (overdue)" : ""}`}
                      style={{
                        position: "absolute",
                        left: x - 3,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: tone,
                        border: "1.5px solid var(--paper)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
