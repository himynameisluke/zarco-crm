import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts, organizations } from "@/lib/db/schema";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * CSV export of the workspace's contacts. Route handlers don't inherit the
 * (app) layout's auth gate, so auth + workspace scoping are enforced here.
 */
export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select({
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      organizationName: organizations.name,
      linkedinUrl: contacts.linkedinUrl,
      notes: contacts.notes,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
    .where(eq(contacts.workspaceId, workspace.id))
    .orderBy(desc(contacts.updatedAt));

  const csv = toCsv(
    [
      "First name",
      "Last name",
      "Email",
      "Phone",
      "Title",
      "Organization",
      "LinkedIn",
      "Notes",
      "Created",
    ],
    rows.map((c) => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.title,
      c.organizationName,
      c.linkedinUrl,
      c.notes,
      c.createdAt.toISOString().slice(0, 10),
    ]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
