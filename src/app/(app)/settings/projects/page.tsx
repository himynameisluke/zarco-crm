import Link from "next/link";
import { ChevronRight, LayoutTemplate, Settings } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { getProjectSettingsOrDefault, getTemplateDetail, listTemplates } from "@/lib/projects/queries";
import { PROJECT_TYPE_LABELS, type ProjectTypeValue } from "@/lib/projects/labels";
import { NewTemplateForm } from "@/components/projects/settings/new-template-form";
import { SeedTemplatesButton } from "@/components/projects/settings/seed-templates-button";
import { DefaultPhasesEditor } from "@/components/projects/settings/default-phases-editor";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const [templates, settings] = await Promise.all([
    listTemplates(workspace.id),
    getProjectSettingsOrDefault(workspace.id),
  ]);

  // Item counts per template — small workspace-scoped list (a handful of
  // templates at most), so a detail fetch per row is simpler than adding a
  // new count query to queries.ts for this settings-only view.
  const details = await Promise.all(
    templates.map((t) => getTemplateDetail(workspace.id, t.id)),
  );
  const countsById = new Map(
    templates.map((t, i) => {
      const items = details[i]?.items ?? [];
      return [
        t.id,
        {
          phases: items.filter((it) => it.kind === "phase").length,
          milestones: items.filter((it) => it.kind === "milestone").length,
          tasks: items.filter((it) => it.kind === "task").length,
        },
      ] as const;
    }),
  );

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Settings, label: "Settings", href: "/settings" },
          { icon: LayoutTemplate, label: "Projects" },
        ]}
      />
      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0, overflowY: "auto" }}>
        <div style={{ padding: 32, maxWidth: 880 }}>
          <h1 className="t-display" style={{ fontSize: 22, margin: 0, color: "var(--ink)" }}>
            Projects
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "4px 0 24px" }}>
            Delivery templates and the default phase sequence new projects fall back to.
          </p>

          {/* Templates ------------------------------------------------ */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="t-eyebrow" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              Templates · {templates.length}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {templates.length === 0 ? <SeedTemplatesButton /> : null}
              <NewTemplateForm />
            </div>
          </div>

          {templates.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-3)",
                fontSize: 12.5,
                marginBottom: 28,
              }}
            >
              No templates yet. Seed the two built-in templates (Zarco Console
              Implementation, Bespoke Software Build) or create your own above.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, marginBottom: 28 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th style={{ width: 180 }}>Type</th>
                    <th style={{ width: 260 }}>Items</th>
                    <th style={{ width: 32 }} aria-label="Row actions" />
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => {
                    const counts = countsById.get(t.id) ?? { phases: 0, milestones: 0, tasks: 0 };
                    return (
                      <tr key={t.id}>
                        <td>
                          <Link
                            href={`/settings/projects/${t.id}`}
                            style={{ color: "var(--ink)", fontWeight: 450, textDecoration: "none" }}
                          >
                            {t.name}
                          </Link>
                          {t.description ? (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "var(--ink-4)",
                                marginTop: 2,
                                maxWidth: 420,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.description}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ color: "var(--ink-3)", fontSize: 12.5 }}>
                          {t.projectType ? PROJECT_TYPE_LABELS[t.projectType as ProjectTypeValue] ?? t.projectType : "—"}
                        </td>
                        <td className="t-mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
                          {counts.phases} phases · {counts.milestones} milestones · {counts.tasks} tasks
                        </td>
                        <td>
                          <Link
                            href={`/settings/projects/${t.id}`}
                            aria-label={`Edit ${t.name}`}
                            style={{ color: "var(--ink-4)", display: "inline-flex" }}
                          >
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Default phases -------------------------------------------- */}
          <span className="t-eyebrow" style={{ fontSize: 10, color: "var(--ink-3)", display: "block", marginBottom: 12 }}>
            Default phases
          </span>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "-6px 0 12px", lineHeight: 1.5 }}>
            The board view and the create wizard fall back to this sequence for any project
            that hasn&apos;t defined its own phases yet.
          </p>
          <div className="card" style={{ padding: 0, marginBottom: 24 }}>
            <DefaultPhasesEditor initialPhases={settings.defaultPhases} />
          </div>

          <Link
            href="/settings"
            style={{ fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} />
            All settings
          </Link>
        </div>
      </main>
    </>
  );
}
