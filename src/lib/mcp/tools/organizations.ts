import { z } from "zod";
import { desc, eq, ilike, or } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { contacts, deals, organizations } from "@/lib/db/schema";
import { getMcpContext, textResult } from "../context";

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
}
