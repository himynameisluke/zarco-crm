import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts, deals, organizations, projects } from "@/lib/db/schema";

type EntityType = "contact" | "organization" | "deal" | "project";

const ENTITY_TABLES = {
  contact: contacts,
  organization: organizations,
  deal: deals,
  project: projects,
} as const;

/**
 * Returns true if the given entity exists AND belongs to the workspace.
 *
 * Used to validate foreign-key references supplied to MCP write tools (e.g.
 * a deal's organizationId, a quote's dealId, an activity's subjectId). Without
 * this check a caller could create rows that link across workspace boundaries,
 * which would later leak data through joins. Because Drizzle bypasses RLS,
 * this app-layer check is the only thing enforcing the boundary.
 */
export async function entityInWorkspace(
  entityType: EntityType,
  id: string,
  workspaceId: string,
): Promise<boolean> {
  const table = ENTITY_TABLES[entityType];
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.workspaceId, workspaceId)))
    .limit(1);
  return Boolean(row);
}
