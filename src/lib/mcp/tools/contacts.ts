import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { activities, contacts, organizations } from "@/lib/db/schema";
import { getMcpContext, textResult } from "../context";

export function registerContactTools(server: McpServer) {
  server.registerTool(
    "find_contact",
    {
      description:
        "Search contacts by name or email. Returns up to 20 matches with id, name, email, title, and organization name. Use get_contact for full details.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Substring match against first name, last name, or email"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ query }, { authInfo }) => {
      getMcpContext(authInfo);
      const pattern = `%${query}%`;
      const rows = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          title: contacts.title,
          organizationName: organizations.name,
        })
        .from(contacts)
        .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
        .where(
          or(
            ilike(contacts.firstName, pattern),
            ilike(contacts.lastName, pattern),
            ilike(contacts.email, pattern),
          ),
        )
        .orderBy(desc(contacts.updatedAt))
        .limit(20);
      return textResult({ count: rows.length, contacts: rows });
    },
  );

  server.registerTool(
    "get_contact",
    {
      description:
        "Get a single contact with all fields plus the 20 most recent activities linked to them. Use find_contact first if you don't know the id.",
      inputSchema: {
        id: z.string().uuid().describe("Contact UUID"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ id }, { authInfo }) => {
      getMcpContext(authInfo);

      const [contact] = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          phone: contacts.phone,
          title: contacts.title,
          linkedinUrl: contacts.linkedinUrl,
          notes: contacts.notes,
          organizationId: contacts.organizationId,
          organizationName: organizations.name,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
        })
        .from(contacts)
        .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
        .where(eq(contacts.id, id))
        .limit(1);

      if (!contact) {
        return textResult({ error: "not_found", id });
      }

      const recentActivities = await db
        .select({
          id: activities.id,
          type: activities.type,
          subject: activities.subject,
          body: activities.body,
          source: activities.source,
          occurredAt: activities.occurredAt,
        })
        .from(activities)
        .where(
          and(
            eq(activities.subjectType, "contact"),
            eq(activities.subjectId, id),
          ),
        )
        .orderBy(desc(activities.occurredAt))
        .limit(20);

      return textResult({
        contact,
        recent_activities: recentActivities,
      });
    },
  );
}
