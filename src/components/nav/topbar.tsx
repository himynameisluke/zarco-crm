import { Bell, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { Sidebar } from "@/components/nav/sidebar";
import { MobileSidebarTrigger } from "@/components/nav/mobile-sidebar";
import { SparkleTrigger } from "@/components/nav/sparkle-trigger";

export type Crumb = {
  label: string;
  href?: string;
  // Optional leading icon for a crumb. Lucide components share this shape.
  icon?: React.ComponentType<{ size?: number | string; color?: string }>;
};

export type TopbarTab = {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  icon?: React.ComponentType<{ size?: number | string; color?: string }>;
};

type TopbarProps = {
  crumbs?: Crumb[];
  tabs?: TopbarTab[];
  actions?: ReactNode;
};

export async function Topbar({ crumbs = [], tabs, actions }: TopbarProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email ?? undefined;
  const workspace = await getCurrentWorkspace();
  const isDemo = workspace?.type === "demo";

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        borderBottom: "1px solid var(--ink-20)",
        // Opaque paper, not glass. Design rule: "no frosted-glass cards. No
        // translucent panels. The page is opaque." The one tolerated blur in
        // the system is a sticky nav backdrop, but it sits on paper and only
        // softens the *content scrolling under it*, not the bar itself.
        background: "var(--paper)",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 14,
      }}
    >
      <MobileSidebarTrigger>
        <Sidebar userEmail={userEmail} />
      </MobileSidebarTrigger>

      {/* Breadcrumbs — slash-separated, ink-60 for parents, ink-100 for the
          current crumb. The slash is the brand's editorial separator
          ("Zarco / Pricing", "Docs / Agents / Triggers"). */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        {crumbs.map((c, i) => {
          const Icon = c.icon;
          const isLast = i === crumbs.length - 1;
          return (
            <div
              key={`${c.label}-${i}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {i > 0 ? (
                <span
                  aria-hidden
                  style={{
                    fontFamily: "var(--code)",
                    color: "var(--ink-20)",
                    fontSize: 13,
                  }}
                >
                  /
                </span>
              ) : null}
              <span
                style={{
                  color: isLast ? "var(--ink)" : "var(--ink-60)",
                  fontWeight: isLast ? 600 : 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {Icon ? <Icon size={13} color="var(--ink-60)" /> : null}
                {c.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Optional tabs (e.g. kanban / list toggle). Inverted segment style:
          inactive tabs are paper, active is ink. Matches the design's
          inverted-active pattern from the sidebar nav items. */}
      {tabs ? (
        <div
          style={{
            marginLeft: 14,
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "var(--paper-pure)",
            border: "1px solid var(--ink-20)",
            borderRadius: 6,
            padding: 2,
            height: 28,
          }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                style={{
                  height: 22,
                  padding: "0 10px",
                  borderRadius: 4,
                  background: t.active ? "var(--ink)" : "transparent",
                  color: t.active ? "var(--paper)" : "var(--ink-60)",
                  border: "none",
                  fontWeight: t.active ? 600 : 500,
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                {Icon ? <Icon size={12} /> : null}
                {t.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div style={{ flex: 1 }} />

      {/* DEMO pill — magenta-wash, mono, uppercase. Same intent (stop Luke
          confusing demo data with real) but in the new palette. */}
      {isDemo ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 999,
            background: "var(--magenta-wash)",
            border: "1px solid transparent",
            color: "var(--magenta-ink)",
            fontSize: 10.5,
            fontFamily: "var(--code)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
          title="You're in the demo workspace — fake data only."
        >
          <Sparkles size={10} />
          Demo workspace
        </span>
      ) : null}

      {actions}
      <button type="button" className="btn btn-ghost btn-icon" title="Notifications">
        <Bell size={15} />
      </button>
      <SparkleTrigger />
    </header>
  );
}
