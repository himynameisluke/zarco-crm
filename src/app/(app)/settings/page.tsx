import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Plug,
  Settings as SettingsIcon,
  User,
  Users,
} from "lucide-react";

import { Topbar } from "@/components/nav/topbar";

type SettingsCard = {
  href: string;
  icon: typeof User;
  title: string;
  description: string;
  status?: { label: string; tone: "ready" | "stub" | "post-mvp" };
};

const SECTIONS: SettingsCard[] = [
  {
    href: "/settings/profile",
    icon: User,
    title: "Profile",
    description: "Your account email and change password.",
    status: { label: "Ready", tone: "ready" },
  },
  {
    href: "/settings/workspace",
    icon: Building2,
    title: "Workspace",
    description: "Workspace name, default currency, timezone.",
    status: { label: "Stub — read-only", tone: "stub" },
  },
  {
    href: "/settings/team",
    icon: Users,
    title: "Team",
    description: "Members and invites. Multi-user support post-MVP.",
    status: { label: "Post-MVP", tone: "post-mvp" },
  },
  {
    href: "/settings/mcp",
    icon: Plug,
    title: "MCP & API",
    description:
      "Connect Claude clients, manage OAuth clients, see active tokens.",
    status: { label: "Ready", tone: "ready" },
  },
];

// Status pills on the settings landing tiles. Map ready → quiet success
// green; stub → quiet warning amber; post-MVP → neutral ink wash. None of
// these is the brand accent — that stays reserved for primary actions.
const TONE_STYLES: Record<
  NonNullable<SettingsCard["status"]>["tone"],
  { bg: string; border: string; color: string }
> = {
  ready: {
    bg: "rgba(31, 122, 77, 0.10)",
    border: "rgba(31, 122, 77, 0.25)",
    color: "var(--success)",
  },
  stub: {
    bg: "rgba(178, 107, 0, 0.10)",
    border: "rgba(178, 107, 0, 0.25)",
    color: "var(--warning)",
  },
  "post-mvp": {
    bg: "var(--ink-04)",
    border: "var(--ink-20)",
    color: "var(--ink-60)",
  },
};

export default function SettingsLanding() {
  return (
    <>
      <Topbar crumbs={[{ icon: SettingsIcon, label: "Settings" }]} />
      <main
        className="screen flex flex-1 flex-col"
        style={{ minWidth: 0, overflowY: "auto" }}
      >
        <div style={{ padding: 32, maxWidth: 960 }}>
          <h1
            className="t-display"
            style={{ fontSize: 22, margin: 0, color: "var(--ink)" }}
          >
            Settings
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              margin: "4px 0 24px",
            }}
          >
            Account, workspace, team, and integrations.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const tone = s.status ? TONE_STYLES[s.status.tone] : null;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="card"
                  style={{
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    textDecoration: "none",
                    color: "inherit",
                    transition:
                      "transform .12s, border-color .12s, background .12s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: "var(--ink)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--paper)",
                      }}
                    >
                      <Icon size={15} />
                    </span>
                    {s.status && tone ? (
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 9.5,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: tone.bg,
                          border: `1px solid ${tone.border}`,
                          color: tone.color,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {s.status.label}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    <h2
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        margin: 0,
                        color: "var(--ink)",
                      }}
                    >
                      {s.title}
                    </h2>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-3)",
                        margin: 0,
                        lineHeight: 1.45,
                      }}
                    >
                      {s.description}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "var(--ink-3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: "auto",
                    }}
                  >
                    Open
                    <ChevronRight size={11} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
