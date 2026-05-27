import Link from "next/link";
import { ChevronRight, Settings, UserPlus, Users } from "lucide-react";

import { Topbar } from "@/components/nav/topbar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "you@zarco.uk";

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Settings, label: "Settings", href: "/settings" },
          { icon: Users, label: "Team" },
        ]}
      />
      <main
        className="screen flex flex-1 flex-col"
        style={{ minWidth: 0, overflowY: "auto" }}
      >
        <div style={{ padding: 32, maxWidth: 720 }}>
          <h1
            className="t-display"
            style={{ fontSize: 22, margin: 0, color: "var(--ink)" }}
          >
            Team
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              margin: "4px 0 20px",
            }}
          >
            Manage teammates with access to your CRM.
          </p>

          {/* Current members (just you) */}
          <div className="card" style={{ padding: 0, marginBottom: 24 }}>
            <header
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid var(--hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                className="t-label"
                style={{ fontSize: 12, color: "var(--ink-2)" }}
              >
                Members · 1
              </span>
            </header>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              <li
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 18px",
                }}
              >
                <span
                  className="zk-avatar"
                  style={{
                    background: "oklch(0.78 0.20 145 / 0.20)",
                    borderColor: "oklch(0.78 0.20 145 / 0.35)",
                    color: "oklch(0.86 0.20 145)",
                  }}
                >
                  {email.slice(0, 2).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>
                    {email}
                  </div>
                  <div
                    className="t-mono"
                    style={{ fontSize: 10.5, color: "var(--ink-4)" }}
                  >
                    OWNER · YOU
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Invite (disabled / post-MVP) */}
          <div
            className="card"
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--surface-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-3)",
              }}
            >
              <UserPlus size={16} />
            </span>
            <div>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  margin: 0,
                  color: "var(--ink)",
                }}
              >
                Invite teammates — coming next
              </h2>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-3)",
                  margin: "4px 0 0",
                  maxWidth: 380,
                  lineHeight: 1.5,
                }}
              >
                Multi-user support ships once the workspace data model lands.
                For now everyone signing in shares the same CRM data via RLS.
              </p>
            </div>
          </div>

          <Link
            href="/settings"
            style={{
              marginTop: 24,
              fontSize: 12.5,
              color: "var(--ink-3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} />
            All settings
          </Link>
        </div>
      </main>
    </>
  );
}
