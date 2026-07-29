import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Layers, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { getWorkspaceMembers } from "@/lib/workspace/members";
import { Topbar } from "@/components/nav/topbar";
import { boardDataset, listProjects, overviewMetrics, timelineDataset } from "@/lib/projects/queries";
import { MetricCards } from "@/components/projects/list/metric-cards";
import { ViewTabs } from "@/components/projects/list/view-tabs";
import { TableView } from "@/components/projects/list/table-view";
import { BoardView } from "@/components/projects/list/board-view";
import { TimelineView } from "@/components/projects/list/timeline-view";
import type { ProjectsQueryParams } from "@/components/projects/list/url";

const SORT_FIELDS = ["name", "target_date", "progress", "last_activity"] as const;

function parseSort(v: string | undefined): (typeof SORT_FIELDS)[number] | undefined {
  if (typeof v === "string" && (SORT_FIELDS as readonly string[]).includes(v)) {
    return v as (typeof SORT_FIELDS)[number];
  }
  return undefined;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<ProjectsQueryParams>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const sp = await searchParams;

  const view = sp.view === "board" || sp.view === "timeline" ? sp.view : "table";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const current: ProjectsQueryParams = { ...sp, view };

  // Metric row is real data, independent of whatever view/filters are
  // active — it's the workspace's overall delivery state, not a summary
  // of the current query.
  const metrics = await overviewMetrics(workspace.id);

  return (
    <>
      <Topbar
        crumbs={[{ icon: Layers, label: "Projects" }]}
        actions={
          <Link href="/projects/new" className="btn btn-primary">
            <Plus size={13} />
            New project
          </Link>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <MetricCards metrics={metrics} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 16px",
            borderBottom: view === "table" ? undefined : "1px solid var(--hairline)",
          }}
        >
          <ViewTabs current={current} />
        </div>

        {view === "table" ? (
          <TableViewSection workspaceId={workspace.id} current={current} page={page} />
        ) : view === "board" ? (
          <BoardViewSection workspaceId={workspace.id} />
        ) : (
          <TimelineViewSection workspaceId={workspace.id} />
        )}
      </main>
    </>
  );
}

async function TableViewSection({
  workspaceId,
  current,
  page,
}: {
  workspaceId: string;
  current: ProjectsQueryParams;
  page: number;
}) {
  const [{ rows, total }, orgRows, members] = await Promise.all([
    listProjects({
      workspaceId,
      q: current.q,
      ownerId: current.ownerId,
      organizationId: current.organizationId,
      status: current.status,
      health: current.health,
      projectType: current.projectType,
      sort: parseSort(current.sort),
      sortDir: current.sortDir === "asc" ? "asc" : "desc",
      page,
    }),
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.workspaceId, workspaceId))
      .orderBy(asc(organizations.name))
      .limit(500),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <TableView rows={rows} total={total} page={page} current={current} organizations={orgRows} members={members} />
  );
}

async function BoardViewSection({ workspaceId }: { workspaceId: string }) {
  const { columns, projectsByColumn } = await boardDataset(workspaceId);
  return <BoardView columns={columns} initialProjectsByColumn={projectsByColumn} />;
}

async function TimelineViewSection({ workspaceId }: { workspaceId: string }) {
  const projects = await timelineDataset(workspaceId);
  return <TimelineView projects={projects} />;
}
