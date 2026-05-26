import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerContactTools } from "./tools/contacts";
import { registerOrganizationTools } from "./tools/organizations";
import { registerDealTools } from "./tools/deals";
import { registerActivityTools } from "./tools/activities";

export const MCP_SERVER_INFO = {
  name: "zarco-crm",
  version: "0.1.0",
} as const;

/**
 * Registers all Zarco CRM tools on a given MCP server instance.
 *
 * Phase B (this branch): read tools only — find/get for contacts, organizations,
 * deals, plus the activity timeline. Phase C will add low-stakes writes.
 */
export function registerTools(server: McpServer) {
  registerContactTools(server);
  registerOrganizationTools(server);
  registerDealTools(server);
  registerActivityTools(server);
}
