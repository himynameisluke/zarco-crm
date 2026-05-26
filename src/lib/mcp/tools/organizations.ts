import { z } from "zod";
import { desc, eq, ilike, or } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { contacts, deals, organizations } from "@/lib/db/schema";
import { auditMcpWrite } from "../audit";
import { getMcpContext, textResult } from "../context";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function registerOrganizationTools(server: McpServer) {
  server.registerTool(
    "find_organization",
    {
      description:
        "Search organizations by name or domain. Returns up to 20 matches with id, name, domain, industry. Use get_organization for full details and related contacts/deals.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Substring match against name or domain"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ query }, { authInfo }) => {
      getMcpContext(authInfo);
      const pattern = `%${query}%`;
      const rows = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          domain: organizations.domain,
          industry: organizations.industry,
        })
        .from(organizations)
        .where(
          or(
            ilike(organizations.name, pattern),
            ilike(organizations.domain, pattern),
          ),
        )
        .orderBy(desc(organizations.updatedAt))
        .limit(20);
      return textResult({ count: rows.length, organizations: rows });
    },
  );

  server.registerTool(
    "get_organization",
    {
      description:
        "Get a single organization with all fields, its contacts, and its deals. Heavy query — only use when you need the full graph.",
      inputSchema: {
        id: z.string().uuid().describe("Organization UUID"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ id }, { authInfo }) => {
      getMcpContext(authInfo);

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);

      if (!org) {
        return textResult({ error: "not_found", id });
      }

      const [orgContacts, orgDeals] = await Promise.all([
        db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            email: contacts.email,
            title: contacts.title,
          })
          .from(contacts)
          .where(eq(contacts.organizationId, id))
          .orderBy(desc(contacts.updatedAt))
          .limit(50),
        db
          .select({
            id: deals.id,
            name: deals.name,
            type: deals.type,
            stage: deals.stage,
            valuePence: deals.valuePence,
            currency: deals.currency,
            closeDate: deals.closeDate,
          })
          .from(deals)
          .where(eq(deals.organizationId, id))
          .orderBy(desc(deals.updatedAt))
          .limit(50),
      ]);

      return textResult({
        organization: org,
        contacts: orgContacts,
        deals: orgDeals,
      });
    },
  );

  server.registerTool(
    "create_organization",
    {
      description:
        "Create a new organization. Name is required; everything else optional. Returns the created organization with its UUID. Logs an audit activity.",
      inputSchema: {
        name: z.string().trim().min(1).max(200),
        domain: z.string().trim().max(200).optional(),
        website: z.string().trim().url().max(500).optional(),
        industry: z.string().trim().max(120).optional(),
        employeeCount: z.number().int().min(0).max(10_000_000).optional(),
        notes: z.string().trim().max(5000).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);
      const [inserted] = await db
        .insert(organizations)
        .values({
          name: input.name,
          domain: nullable(input.domain),
          website: nullable(input.website),
          industry: nullable(input.industry),
          employeeCount: input.employeeCount ?? null,
          notes: nullable(input.notes),
          ownerId: userId,
        })
        .returning();

      await auditMcpWrite({
        type: "note",
        subjectType: "organization",
        subjectId: inserted.id,
        subject: `Created organization ${inserted.name}`,
        userId,
      });

      return textResult({ created: inserted });
    },
  );
}
