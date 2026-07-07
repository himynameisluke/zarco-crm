import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * CSV export of the workspace's organizations. Route handlers don't inherit
 * the (app) layout's auth gate, so auth + workspace scoping are enforced here.
 */
export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select({
      name: organizations.name,
      domain: organizations.domain,
      website: organizations.website,
      industry: organizations.industry,
      employeeCount: organizations.employeeCount,
      notes: organizations.notes,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.workspaceId, workspace.id))
    .orderBy(desc(organizations.updatedAt));

  const csv = toCsv(
    ["Name", "Domain", "Website", "Industry", "Employees", "Notes", "Created"],
    rows.map((o) => [
      o.name,
      o.domain,
      o.website,
      o.industry,
      o.employeeCount,
      o.notes,
      o.createdAt.toISOString().slice(0, 10),
    ]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="organizations-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
