import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, LayoutTemplate, Settings } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { getTemplateDetail } from "@/lib/projects/queries";
import { TemplateEditForm } from "@/components/projects/settings/template-edit-form";
import { TemplateItemsEditor } from "@/components/projects/settings/template-items-editor";
import { DeleteTemplateButton } from "@/components/projects/settings/delete-template-button";

// Reached from /settings/projects's "new template" + row links, and from
// createProjectTemplate's post-create redirect (actions.ts, not owned by
// this route) — so this page is required infrastructure for that action to
// resolve anywhere, not an optional extra.
export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const detail = await getTemplateDetail(workspace.id, id);
  if (!detail) notFound();

  const { template, items } = detail;

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Settings, label: "Settings", href: "/settings" },
          { icon: LayoutTemplate, label: "Projects", href: "/settings/projects" },
          { label: template.name },
        ]}
      />
      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0, overflowY: "auto" }}>
        <div style={{ padding: 32, maxWidth: 960 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <h1 className="t-display" style={{ fontSize: 22, margin: 0, color: "var(--ink)" }}>
                {template.name}
              </h1>
              <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "4px 0 0" }}>
                Template · editable for this workspace only.
              </p>
            </div>
            <DeleteTemplateButton templateId={template.id} name={template.name} />
          </div>

          <span className="t-eyebrow" style={{ fontSize: 10, color: "var(--ink-3)", display: "block", marginBottom: 12 }}>
            Details
          </span>
          <div style={{ marginBottom: 28 }}>
            <TemplateEditForm
              templateId={template.id}
              name={template.name}
              description={template.description}
              projectType={template.projectType}
            />
          </div>

          <span className="t-eyebrow" style={{ fontSize: 10, color: "var(--ink-3)", display: "block", marginBottom: 12 }}>
            Items · {items.length}
          </span>
          <div className="card" style={{ padding: 16, marginBottom: 24 }}>
            <TemplateItemsEditor
              templateId={template.id}
              initialItems={items.map((item) => ({
                kind: item.kind,
                name: item.name,
                description: item.description,
                phaseName: item.phaseName,
                offsetDays: item.offsetDays,
              }))}
            />
          </div>

          <Link
            href="/settings/projects"
            style={{ fontSize: 12.5, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} />
            All templates
          </Link>
        </div>
      </main>
    </>
  );
}
