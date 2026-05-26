import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerContactTools } from "./tools/contacts";
import { registerOrganizationTools } from "./tools/organizations";
import { registerDealTools } from "./tools/deals";
import { registerActivityTools } from "./tools/activities";
import { registerTaskTools } from "./tools/tasks";
import { registerHighStakesTools } from "./tools/high-stakes";

export const MCP_SERVER_INFO = {
  name: "zarco-crm",
  version: "0.3.0",
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
 * High-stakes tools (require confirm=true, marked destructiveHint):
 *   - Deletes:        delete_contact, delete_organization, delete_deal
 *   - Sends (stub):   send_email, send_quote — real delivery ships with
 *                     the Resend integration; for now they record intent
 *                     and transition state.
 */
export function registerTools(server: McpServer) {
  registerContactTools(server);
  registerOrganizationTools(server);
  registerDealTools(server);
  registerActivityTools(server);
  registerTaskTools(server);
  registerHighStakesTools(server);
}
