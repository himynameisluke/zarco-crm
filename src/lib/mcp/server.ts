import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerContactTools } from "./tools/contacts";
import { registerOrganizationTools } from "./tools/organizations";
import { registerDealTools } from "./tools/deals";
import { registerActivityTools } from "./tools/activities";
import { registerTaskTools } from "./tools/tasks";

export const MCP_SERVER_INFO = {
  name: "zarco-crm",
  version: "0.2.0",
} as const;

/**
 * Registers all Zarco CRM tools on a given MCP server instance.
 *
 * Read tools: find/get for contacts, organizations, deals, plus activity
 * search + recent-activities feed.
 *
 * Write tools (all audit via auditMcpWrite, tagged source='mcp'):
 *   - Contacts:       create_contact, update_contact
 *   - Organizations:  create_organization
 *   - Deals:          create_deal, update_deal_stage
 *   - Activities:     log_activity
 *   - Tasks:          create_task, complete_task
 *
 * Still deferred to a future phase: high-stakes writes (send_quote,
 * send_email, delete_*) gated by MCP elicitation, and the composite
 * record_meeting tool (dropped per Path B decision — Luke's Claude
 * composes the narrow primitives via subscription instead).
 */
export function registerTools(server: McpServer) {
  registerContactTools(server);
  registerOrganizationTools(server);
  registerDealTools(server);
  registerActivityTools(server);
  registerTaskTools(server);
}
