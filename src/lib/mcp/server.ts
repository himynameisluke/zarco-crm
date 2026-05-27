import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerContactTools } from "./tools/contacts";
import { registerOrganizationTools } from "./tools/organizations";
import { registerDealTools } from "./tools/deals";
import { registerActivityTools } from "./tools/activities";
import { registerTaskTools } from "./tools/tasks";
import { registerQuoteTools } from "./tools/quotes";
import { registerHighStakesTools } from "./tools/high-stakes";

export const MCP_SERVER_INFO = {
  name: "zarco-crm",
  version: "0.4.0",
} as const;

/**
 * Registers all Zarco CRM tools on a given MCP server instance.
 *
 * Read tools (every entity has find / get / list variants):
 *   - Contacts:       find_contact, get_contact, list_contacts
 *   - Organizations:  find_organization, get_organization, list_organizations
 *   - Deals:          find_deal, get_deal, list_deals, get_pipeline_summary
 *   - Activities:     search_activities, list_recent_activities
 *   - Tasks:          list_tasks
 *   - Quotes:         list_quotes, get_quote
 *
 * Write tools (all audit via auditMcpWrite, tagged source='mcp'):
 *   - Contacts:       create_contact, update_contact
 *   - Organizations:  create_organization, update_organization
 *   - Deals:          create_deal, update_deal, update_deal_stage
 *   - Activities:     log_activity
 *   - Tasks:          create_task, complete_task
 *   - Quotes:         create_quote, update_quote
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
  registerQuoteTools(server);
  registerHighStakesTools(server);
}
