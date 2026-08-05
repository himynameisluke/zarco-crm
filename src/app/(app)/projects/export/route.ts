import { NextResponse } from "next/server";

import { getCurrentWorkspace } from "@/lib/workspace/current";
import { listProjects } from "@/lib/projects/queries";
import { toCsv } from "@/lib/csv";
import { formatDateShort } from "@/lib/format";
import { businessDateString } from "@/lib/dates/business";

export const dynamic = "force-dynamic";

/**
 * CSV export of the workspace's projects. Route handlers don't inherit the
 * (app) layout's auth gate, so auth + workspace scoping are enforced here
 * (contacts export precedent). Applies the same q/filter params as the
 * /projects table, unpaginated (no limit).
 */
export async function GET(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const { rows } = await listProjects({
    workspaceId: workspace.id,
    q: searchParams.get("q") ?? undefined,
    ownerId: searchParams.get("ownerId") ?? undefined,
    organizationId: searchParams.get("organizationId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    health: searchParams.get("health") ?? undefined,
    projectType: searchParams.get("projectType") ?? undefined,
    pageSize: 10000,
  });

  const csv = toCsv(
    [
      "Name",
      "Organization",
      "Owner",
      "Phase",
      "Status",
      "Health",
      "Progress",
      "Start",
      "Target end",
      "Open tasks",
      "Blockers",
      "Last activity",
    ],
    rows.map((p) => [
      p.name,
      p.organizationName,
      p.ownerName,
      p.currentPhaseName,
      p.status,
      p.health,
      p.progress,
      p.startDate,
      p.endDate,
      p.openTaskCount,
      p.blockerCount,
      p.lastActivityAt ? formatDateShort(p.lastActivityAt) : null,
    ]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="projects-${businessDateString()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
