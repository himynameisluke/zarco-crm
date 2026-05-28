import { Bell, ChevronRight, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { Sidebar } from "@/components/nav/sidebar";
import { MobileSidebarTrigger } from "@/components/nav/mobile-sidebar";
import { SparkleTrigger } from "@/components/nav/sparkle-trigger";

export type Crumb = {
  label: string;
  href?: string;
  icon?: typeof ChevronRight;
};

export type TopbarTab = {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  icon?: typeof ChevronRight;
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
        height: 48,
        flexShrink: 0,
        borderBottom: "1px solid var(--hairline)",
        background: "rgba(14, 26, 46, 0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 14,
      }}
    >
      <MobileSidebarTrigger>
        <Sidebar userEmail={userEmail} />
      </MobileSidebarTrigger>

      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        {crumbs.map((c, i) => {
          const Icon = c.icon;
          const isLast = i === crumbs.length - 1;
          return (
            <div
              key={`${c.label}-${i}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {i > 0 ? <ChevronRight size={12} color="var(--ink-4)" /> : null}
              <span
                style={{
                  color: isLast ? "var(--ink)" : "var(--ink-3)",
                  fontWeight: isLast ? 500 : 400,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {Icon ? <Icon size={13} color="var(--ink-3)" /> : null}
                {c.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Optional tabs (e.g. kanban / list toggle) */}
      {tabs ? (
        <div
          style={{
            marginLeft: 14,
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "var(--surface-2)",
            border: "1px solid var(--hairline)",
            borderRadius: 7,
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
                  borderRadius: 5,
                  background: t.active ? "var(--surface-4)" : "transparent",
                  color: t.active ? "var(--ink)" : "var(--ink-3)",
                  border: "none",
                  fontWeight: t.active ? 500 : 400,
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

      {/* DEMO pill — only when current workspace.type === 'demo'. Stops Luke
          from confusing customer-facing demo data with the real CRM at a
          glance. Sits in the topbar so it's visible on every page. */}
      {isDemo ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 999,
            background: "oklch(0.82 0.14 70 / 0.16)",
            border: "1px solid oklch(0.82 0.14 70 / 0.32)",
            color: "oklch(0.88 0.14 70)",
            fontSize: 10.5,
            fontFamily: "var(--code)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
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
