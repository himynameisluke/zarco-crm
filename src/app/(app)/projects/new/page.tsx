import { asc, desc, eq } from "drizzle-orm";
import { Layers } from "lucide-react";

import { db } from "@/lib/db";
import { deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { getWorkspaceMembers } from "@/lib/workspace/members";
import { listTemplates, getTemplateDetail } from "@/lib/projects/queries";
import { Topbar } from "@/components/nav/topbar";
import { ProjectWizard, type WizardTemplate } from "@/components/projects/detail/project-wizard";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; dealId?: string }>;
}) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { organizationId, dealId } = await searchParams;

  const [orgOptions, dealOptions, members, templates] = await Promise.all([
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.workspaceId, workspace.id))
      .orderBy(asc(organizations.name))
      .limit(200),
    db
      .select({ id: deals.id, name: deals.name })
      .from(deals)
      .where(eq(deals.workspaceId, workspace.id))
      .orderBy(desc(deals.updatedAt))
      .limit(200),
    getWorkspaceMembers(workspace.id),
    listTemplates(workspace.id),
  ]);

  const templateDetails = await Promise.all(
    templates.map((t) => getTemplateDetail(workspace.id, t.id)),
  );
  const wizardTemplates: WizardTemplate[] = templateDetails
    .filter((d): d is NonNullable<typeof d> => d != null)
    .map((d) => ({
      id: d.template.id,
      name: d.template.name,
      description: d.template.description,
      projectType: d.template.projectType,
      items: d.items,
    }));

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Layers, label: "Projects" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ProjectWizard
            organizationOptions={orgOptions}
            dealOptions={dealOptions}
            memberOptions={members.map((m) => ({ id: m.id, name: m.name }))}
            templates={wizardTemplates}
            currentUserId={user.id}
            initialOrganizationId={
              organizationId && orgOptions.some((o) => o.id === organizationId)
                ? organizationId
                : undefined
            }
            initialDealId={
              dealId && dealOptions.some((d) => d.id === dealId) ? dealId : undefined
            }
          />
        </div>
      </main>
    </>
  );
}
