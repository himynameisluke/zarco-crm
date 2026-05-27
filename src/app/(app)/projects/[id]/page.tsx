import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  Activity as ActivityIcon,
  Layers,
  Pencil,
} from "lucide-react";

import { db } from "@/lib/db";
import { activities, deals, projects } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Topbar } from "@/components/nav/topbar";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { ActivityComposer } from "@/components/activity/activity-composer";
import { formatDateShort } from "@/lib/format";
import {
  PROJECT_STATUS_ACCENT,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "../schema";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      notes: projects.notes,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      dealId: projects.dealId,
      dealName: deals.name,
    })
    .from(projects)
    .leftJoin(deals, eq(projects.dealId, deals.id))
    .where(
      and(eq(projects.id, id), eq(projects.workspaceId, workspace.id)),
    )
    .limit(1);

  if (!project) {
    notFound();
  }

  const timeline = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.workspaceId, workspace.id),
        eq(activities.subjectType, "project"),
        eq(activities.subjectId, id),
      ),
    )
    .orderBy(desc(activities.occurredAt))
    .limit(20);

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Layers, label: "Projects" },
          { label: project.name },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${project.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </>
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <PageHeader
          title={project.name}
          description={
            PROJECT_STATUS_LABELS[project.status as ProjectStatus]
          }
        />

        <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-8">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background:
                      PROJECT_STATUS_ACCENT[project.status as ProjectStatus],
                    marginTop: 6,
                  }}
                />
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-foreground">
                    {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
                  </p>
                </div>
              </div>
              {project.dealId && project.dealName ? (
                <div className="space-y-0.5 text-sm">
                  <p className="text-xs text-muted-foreground">Linked deal</p>
                  <Link
                    href={`/deals/${project.dealId}`}
                    className="hover:underline"
                  >
                    {project.dealName}
                  </Link>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="text-foreground">
                    {project.startDate
                      ? formatDateShort(project.startDate)
                      : "—"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">End</p>
                  <p className="text-foreground">
                    {project.endDate ? formatDateShort(project.endDate) : "—"}
                  </p>
                </div>
              </div>

              {project.notes ? (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap text-sm">{project.notes}</p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <ActivityComposer subjectType="project" subjectId={project.id} />
            <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <EmptyState
                  icon={ActivityIcon}
                  title="No activity yet"
                  description="Notes, calls, and meetings logged against this project will appear here."
                />
              ) : (
                <ol className="space-y-4">
                  {timeline.map((event) => (
                    <li key={event.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">
                        {event.subject ?? event.type}
                      </p>
                      {event.body ? (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                          {event.body}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {event.type} ·{" "}
                        {event.occurredAt.toLocaleString("en-GB")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
    </>
  );
}
