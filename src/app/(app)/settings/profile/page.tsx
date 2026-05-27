import Link from "next/link";
import { ChevronRight, Settings, User } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/nav/topbar";

import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "unknown";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Settings, label: "Settings", href: "/settings" },
          { icon: User, label: "Profile" },
        ]}
      />
      <main
        className="screen flex flex-1 flex-col"
        style={{ minWidth: 0, overflowY: "auto" }}
      >
        <div style={{ padding: 32, maxWidth: 720 }}>
          {/* Account */}
          <section style={{ marginBottom: 32 }}>
            <h1
              className="t-display"
              style={{ fontSize: 22, margin: 0, color: "var(--ink)" }}
            >
              Profile
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-3)",
                margin: "4px 0 20px",
              }}
            >
              Your account details and password.
            </p>

            <div
              className="card"
              style={{
                padding: 20,
                display: "grid",
                gap: 14,
                gridTemplateColumns: "1fr",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <span
                  className="t-label"
                  style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                  Email
                </span>
                <span style={{ fontSize: 14, color: "var(--ink)" }}>
                  {email}
                </span>
                <span
                  className="t-mono"
                  style={{ fontSize: 10.5, color: "var(--ink-4)" }}
                >
                  Email can&apos;t be changed in-app yet (requires confirmation
                  flow). Edit via Supabase dashboard if needed.
                </span>
              </div>
              <hr
                style={{
                  border: 0,
                  borderTop: "1px solid var(--hairline)",
                  margin: 0,
                }}
              />
              <div style={{ display: "grid", gap: 4 }}>
                <span
                  className="t-label"
                  style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                  Member since
                </span>
                <span style={{ fontSize: 14, color: "var(--ink)" }}>
                  {createdAt}
                </span>
              </div>
            </div>
          </section>

          {/* Change password */}
          <section style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 500,
                margin: "0 0 12px",
                color: "var(--ink)",
              }}
            >
              Change password
            </h2>
            <ChangePasswordForm />
          </section>

          {/* Back link */}
          <Link
            href="/settings"
            style={{
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
