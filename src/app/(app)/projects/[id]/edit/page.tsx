import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { Layers } from "lucide-react";

import { db } from "@/lib/db";
import { deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { getWorkspaceMembers } from "@/lib/workspace/members";
import { getProjectDetail } from "@/lib/projects/queries";
import { Topbar } from "@/components/nav/topbar";
import { ProjectEditForm } from "@/components/projects/detail/project-edit-form";
import { updateProjectDetailsForm } from "../../actions-detail-extra";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [detail, orgOptions, dealOptions, members] = await Promise.all([
    getProjectDetail(workspace.id, id),
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
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Layers, label: "Projects" },
          { label: detail.project.name },
          { label: "Edit" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ProjectEditForm
            action={updateProjectDetailsForm.bind(null, id)}
            project={detail.project}
            organizationOptions={orgOptions}
            dealOptions={dealOptions}
            memberOptions={members.map((m) => ({ id: m.id, name: m.name }))}
            phases={detail.phases}
          />
        </div>
      </main>
    </>
  );
}
