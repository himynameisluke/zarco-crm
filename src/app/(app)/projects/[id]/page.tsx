import { notFound } from "next/navigation";
import { Layers } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { getWorkspaceMembers } from "@/lib/workspace/members";
import { getProjectDetail, getProjectActivities } from "@/lib/projects/queries";
import { effectiveProgress } from "@/lib/projects/progress";
import { healthAdvisories, type ProjectHealthValue } from "@/lib/projects/health";
import { PROJECT_TYPE_LABELS, type ProjectTypeValue } from "@/lib/projects/labels";
import { Topbar } from "@/components/nav/topbar";
import { PageHeader } from "@/components/page-header";
import { ProjectWorkspace } from "@/components/projects/detail/project-workspace";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const detail = await getProjectDetail(workspace.id, id);
  if (!detail) {
    notFound();
  }

  const [members, activities] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    getProjectActivities(workspace.id, id, 1, 20),
  ]);

  const progress = effectiveProgress(detail.project, detail.tasks);

  const advisories = healthAdvisories({
    project: {
      health: detail.project.health as ProjectHealthValue,
      status: detail.project.status,
      endDate: detail.project.endDate ? new Date(detail.project.endDate) : null,
    },
    milestones: detail.milestones.map((m) => ({
      name: m.name,
      dueDate: m.dueDate ? new Date(m.dueDate) : null,
      completedAt: m.completedAt,
    })),
    risks: detail.risks.map((r) => ({
      kind: r.kind,
      title: r.title,
      severity: r.severity,
      status: r.status,
    })),
    tasks: detail.tasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueAt: t.dueAt,
    })),
    now: new Date(),
  });

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Layers, label: "Projects" },
          { label: detail.project.name },
        ]}
        actions={
          <DeleteProjectButton projectId={detail.project.id} projectName={detail.project.name} />
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <PageHeader
          title={detail.project.name}
          description={
            detail.project.projectType
              ? PROJECT_TYPE_LABELS[detail.project.projectType as ProjectTypeValue]
              : undefined
          }
        />
        <div className="mx-auto max-w-5xl p-4 lg:p-8">
          <ProjectWorkspace
            detail={detail}
            members={members.map((m) => ({ id: m.id, name: m.name }))}
            progress={progress}
            advisories={advisories}
            activitiesTotal={activities.total}
          />
        </div>
      </main>
    </>
  );
}
