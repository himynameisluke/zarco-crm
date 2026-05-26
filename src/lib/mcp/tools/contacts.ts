import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { activities, contacts, organizations } from "@/lib/db/schema";
import { auditMcpWrite } from "../audit";
import { getMcpContext, textResult } from "../context";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function fullName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed";
}

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

  server.registerTool(
    "create_contact",
    {
      description:
        "Create a new contact. First name is required; everything else optional. Returns the created contact with its UUID. Logs an audit activity tagged source='mcp'.",
      inputSchema: {
        firstName: z.string().trim().min(1).max(120),
        lastName: z.string().trim().max(120).optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().max(60).optional(),
        title: z.string().trim().max(120).optional(),
        linkedinUrl: z.string().trim().url().max(500).optional(),
        organizationId: z.string().uuid().optional(),
        notes: z.string().trim().max(5000).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);
      const [inserted] = await db
        .insert(contacts)
        .values({
          firstName: input.firstName,
          lastName: nullable(input.lastName),
          email: nullable(input.email),
          phone: nullable(input.phone),
          title: nullable(input.title),
          linkedinUrl: nullable(input.linkedinUrl),
          organizationId: input.organizationId ?? null,
          notes: nullable(input.notes),
          ownerId: userId,
        })
        .returning();

      await auditMcpWrite({
        type: "note",
        subjectType: "contact",
        subjectId: inserted.id,
        subject: `Created contact ${fullName(inserted)}`,
        userId,
      });

      return textResult({ created: inserted });
    },
  );

  server.registerTool(
    "update_contact",
    {
      description:
        "Update an existing contact. Pass only the fields you want to change. Returns the updated contact. Logs an audit activity.",
      inputSchema: {
        id: z.string().uuid(),
        firstName: z.string().trim().min(1).max(120).optional(),
        lastName: z.string().trim().max(120).optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().max(60).optional(),
        title: z.string().trim().max(120).optional(),
        linkedinUrl: z.string().trim().url().max(500).optional(),
        organizationId: z.string().uuid().optional(),
        notes: z.string().trim().max(5000).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id, ...patch }, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);

      const updateValues: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.firstName !== undefined) updateValues.firstName = patch.firstName;
      if (patch.lastName !== undefined) updateValues.lastName = nullable(patch.lastName);
      if (patch.email !== undefined) updateValues.email = nullable(patch.email);
      if (patch.phone !== undefined) updateValues.phone = nullable(patch.phone);
      if (patch.title !== undefined) updateValues.title = nullable(patch.title);
      if (patch.linkedinUrl !== undefined)
        updateValues.linkedinUrl = nullable(patch.linkedinUrl);
      if (patch.organizationId !== undefined)
        updateValues.organizationId = patch.organizationId;
      if (patch.notes !== undefined) updateValues.notes = nullable(patch.notes);

      const [updated] = await db
        .update(contacts)
        .set(updateValues)
        .where(eq(contacts.id, id))
        .returning();

      if (!updated) {
        return textResult({ error: "not_found", id });
      }

      const changedFields = Object.keys(updateValues).filter(
        (k) => k !== "updatedAt",
      );

      await auditMcpWrite({
        type: "note",
        subjectType: "contact",
        subjectId: id,
        subject: `Updated contact ${fullName(updated)}`,
        body:
          changedFields.length > 0
            ? `Changed: ${changedFields.join(", ")}`
            : undefined,
        userId,
      });

      return textResult({ updated });
    },
  );
}
