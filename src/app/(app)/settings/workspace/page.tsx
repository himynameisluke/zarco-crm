import Link from "next/link";
import { Building2, ChevronRight, Info, Settings } from "lucide-react";

import { Topbar } from "@/components/nav/topbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// NOTE: workspace settings aren't yet persisted — there's no `workspaces`
// table. This is a stub UI matching the design system; wiring it requires:
//   1. workspaces table (single row for solo, multi-row when team support lands)
//   2. server action to update name / currency / timezone
//   3. read those values wherever they're displayed (quote totals, dashboard)
// For now the form is read-only with the defaults baked into code.

export default function WorkspaceSettingsPage() {
  return (
    <>
      <Topbar
        crumbs={[
          { icon: Settings, label: "Settings", href: "/settings" },
          { icon: Building2, label: "Workspace" },
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
            Workspace
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              margin: "4px 0 20px",
            }}
          >
            Defaults that apply across your CRM.
          </p>

          {/* Read-only notice: paper-pure card with a thin hairline. The
              system avoids tinted info blocks — quietness > color-coding. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 8,
              background: "var(--paper-pure)",
              border: "1px solid var(--ink-20)",
              marginBottom: 20,
            }}
          >
            <Info
              size={14}
              color="var(--ink-60)"
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <p
              style={{
                fontSize: 12.5,
                color: "var(--ink-2)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Read-only for now — these aren&apos;t persisted yet. Currency is
              hard-coded to GBP and timezone follows your browser. Wiring up
              storage is a small follow-up.
            </p>
          </div>

          <form className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
            <div className="grid gap-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                name="workspaceName"
                defaultValue="Zarco"
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultCurrency">Default currency</Label>
              <Input
                id="defaultCurrency"
                name="defaultCurrency"
                defaultValue="GBP (£)"
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                name="timezone"
                defaultValue="Europe/London (system default)"
                disabled
              />
            </div>
            <div>
              <Button type="submit" disabled>
                Save changes
              </Button>
            </div>
          </form>

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
