import Link from "next/link";
import { GanttChartSquare, SquareKanban, Table2 } from "lucide-react";

import { projectsHref, type ProjectsQueryParams } from "./url";

const VIEWS = [
  { key: "table", label: "Table", icon: Table2 },
  { key: "board", label: "Board", icon: SquareKanban },
  { key: "timeline", label: "Timeline", icon: GanttChartSquare },
] as const;

/**
 * Inverted segmented control matching the topbar tabs visual (ink-filled
 * active tile, paper-60 inactive) but rendered as real `<Link>`s — the
 * view is URL state (`?view=`), never client state, so it survives a
 * refresh/share/bookmark. Switching views intentionally drops filters:
 * board/timeline have no filter params to carry over, and landing back
 * on table always starts from its default (all rows, page 1).
 */
export function ViewTabs({ current }: { current: ProjectsQueryParams }) {
  const activeView = current.view === "board" || current.view === "timeline" ? current.view : "table";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        background: "var(--paper-pure)",
        border: "1px solid var(--ink-20)",
        borderRadius: 6,
        padding: 2,
        height: 28,
        flexShrink: 0,
      }}
    >
      {VIEWS.map((v) => {
        const active = v.key === activeView;
        const Icon = v.icon;
        return (
          <Link
            key={v.key}
            href={projectsHref({}, { view: v.key })}
            style={{
              height: 22,
              padding: "0 10px",
              borderRadius: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--paper)" : "var(--ink-60)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={12} />
            {v.label}
          </Link>
        );
      })}
    </div>
  );
}
