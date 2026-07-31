import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { entityInWorkspace } from "../scope";
import { requireMcpWorkspace, textResult } from "../context";
import { isWorkspaceMember } from "@/lib/workspace/members";
import { getProjectDetail, listOverdueProjectWork, listProjects } from "@/lib/projects/queries";
import {
  createProjectCore,
  createProjectTaskCore,
  completeMilestoneCore,
  raiseRiskCore,
  resolveRiskCore,
  updateProjectCore,
} from "@/lib/projects/writes";
import {
  PROJECT_HEALTHS,
  PROJECT_RISK_KINDS,
  PROJECT_RISK_LIKELIHOODS,
  PROJECT_RISK_SEVERITIES,
  PROJECT_TYPES,
  TASK_PRIORITIES,
} from "@/lib/projects/labels";

const PROJECT_STATUS_VALUES = ["not_started", "in_progress", "on_hold", "completed"] as const;

/**
 * Same membership check the web actions run on owner/assignee ids
 * (src/lib/workspace/members.ts) — without it MCP could assign a project
 * owner/task assignee/risk owner from another workspace entirely. Returns
 * the tools' standard invalid_reference error payload, or null when clear.
 */
async function memberReferenceError(
  workspaceId: string,
  userId: string | null | undefined,
  field: string,
): Promise<{ error: "invalid_reference"; message: string } | null> {
  if (userId && !(await isWorkspaceMember(workspaceId, userId))) {
    return { error: "invalid_reference", message: `${field} is not a member of this workspace` };
  }
  return null;
}

export function registerProjectTools(server: McpServer) {
  server.registerTool(
    "list_projects",
    {
      description:
        "List projects with optional filters: status, health, organizationId. Returns id, name, org, owner, status, health, phase, progress, open task count, blocker count, dates. Default limit 50, ordered by most recently updated.",
      inputSchema: {
        status: z.enum(PROJECT_STATUS_VALUES).optional(),
        health: z.enum(PROJECT_HEALTHS).optional(),
        organizationId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ status, health, organizationId, limit }, { authInfo }) => {
      const { workspaceId } = await requireMcpWorkspace(authInfo);

      const { rows, total } = await listProjects({
        workspaceId,
        status,
        health,
        organizationId,
        pageSize: limit,
      });

      return textResult({ count: rows.length, total, projects: rows });
    },
  );

  server.registerTool(
    "get_project",
    {
      description:
        "Get a project's full working picture: header (org, owner, status, health, phase), phases, milestones, open risks/blockers, task counts, and recent activity. Use this before making follow-up decisions about a project.",
      inputSchema: {
        id: z.string().uuid().describe("Project UUID"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ id }, { authInfo }) => {
      const { workspaceId } = await requireMcpWorkspace(authInfo);

      const detail = await getProjectDetail(workspaceId, id);
      if (!detail) return textResult({ error: "not_found", id });

      const openTasks = detail.tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
      const openRisks = detail.risks.filter((r) => r.status !== "resolved");

      return textResult({
        project: detail.project,
        organization: detail.organization,
        ownerName: detail.ownerName,
        templateName: detail.templateName,
        phases: detail.phases,
        milestones: detail.milestones,
        openRisks,
        taskCounts: {
          total: detail.tasks.length,
          open: openTasks.length,
          done: detail.tasks.filter((t) => t.status === "done").length,
        },
        recentActivity: detail.recentActivities.slice(0, 10),
      });
    },
  );

  server.registerTool(
    "create_project",
    {
      description:
        "Create a new project. Name is required; everything else optional. When templateId is set, the template's phases/milestones/tasks are expanded onto the new project in one transaction (dates resolved from the project's startDate + each item's offsetDays). status defaults to 'not_started', health to 'on_track'.",
      inputSchema: {
        name: z.string().trim().min(1).max(200),
        organizationId: z.string().uuid().optional(),
        dealId: z.string().uuid().optional(),
        ownerId: z.string().uuid().optional(),
        status: z.enum(PROJECT_STATUS_VALUES).default("not_started"),
        health: z.enum(PROJECT_HEALTHS).default("on_track"),
        projectType: z.enum(PROJECT_TYPES).optional(),
        description: z.string().trim().max(10000).optional(),
        successCriteria: z.string().trim().max(10000).optional(),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .optional(),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .optional(),
        notes: z.string().trim().max(5000).optional(),
        templateId: z.string().uuid().optional().describe("A project_templates id in this workspace"),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      if (
        input.organizationId &&
        !(await entityInWorkspace("organization", input.organizationId, workspaceId))
      ) {
        return textResult({ error: "invalid_reference", message: "organizationId does not exist in this workspace" });
      }
      if (input.dealId && !(await entityInWorkspace("deal", input.dealId, workspaceId))) {
        return textResult({ error: "invalid_reference", message: "dealId does not exist in this workspace" });
      }
      if (input.templateId && !(await entityInWorkspace("template", input.templateId, workspaceId))) {
        return textResult({ error: "invalid_reference", message: "templateId does not exist in this workspace" });
      }
      const ownerErr = await memberReferenceError(workspaceId, input.ownerId, "ownerId");
      if (ownerErr) return textResult(ownerErr);

      const { id } = await createProjectCore({
        workspaceId,
        userId,
        name: input.name,
        organizationId: input.organizationId ?? null,
        dealId: input.dealId ?? null,
        ownerId: input.ownerId ?? userId,
        status: input.status,
        health: input.health,
        projectType: input.projectType ?? null,
        description: input.description ?? null,
        successCriteria: input.successCriteria ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        notes: input.notes ?? null,
        templateId: input.templateId ?? null,
        source: "mcp",
      });

      const created = await getProjectDetail(workspaceId, id);
      return textResult({ created: created?.project ?? { id } });
    },
  );

  server.registerTool(
    "update_project",
    {
      description:
        "Update an existing project's status/health/phase/dates/owner (and description/successCriteria/progressManual). Pass only what you want to change. Writes the same activities as the web app: a status_change on status or phase moves (phase moves carry metadata {kind:'phase', from, to}), a note on owner change.",
      inputSchema: {
        id: z.string().uuid(),
        status: z.enum(PROJECT_STATUS_VALUES).optional(),
        health: z.enum(PROJECT_HEALTHS).optional(),
        currentPhaseId: z.string().uuid().nullable().optional().describe("Set null to move to Unphased"),
        ownerId: z.string().uuid().nullable().optional(),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .nullable()
          .optional(),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .nullable()
          .optional(),
        description: z.string().trim().max(10000).nullable().optional(),
        successCriteria: z.string().trim().max(10000).nullable().optional(),
        progressManual: z
          .number()
          .int()
          .min(0)
          .max(100)
          .nullable()
          .optional()
          .describe("Override the tasks-derived progress. Set null to go back to computed."),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id, ...patch }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      if (
        patch.currentPhaseId &&
        !(await entityInWorkspace("phase", patch.currentPhaseId, workspaceId))
      ) {
        return textResult({ error: "invalid_reference", message: "currentPhaseId does not exist in this workspace" });
      }
      const ownerErr = await memberReferenceError(workspaceId, patch.ownerId, "ownerId");
      if (ownerErr) return textResult(ownerErr);

      const result = await updateProjectCore({
        workspaceId,
        userId,
        id,
        patch,
        source: "mcp",
      });
      if ("error" in result) return textResult({ error: "not_found", id });

      return textResult({ updated: result.updated });
    },
  );

  server.registerTool(
    "add_project_task",
    {
      description:
        "Add a task to a project. Title required. Optionally set priority, dueAt, assignedTo, phase/milestone linkage. Logs a note activity on the project's timeline.",
      inputSchema: {
        projectId: z.string().uuid(),
        title: z.string().trim().min(1).max(500),
        description: z.string().trim().max(5000).optional(),
        priority: z.enum(TASK_PRIORITIES).default("normal"),
        dueAt: z.string().datetime({ offset: true }).optional().describe("ISO 8601 timestamp"),
        assignedTo: z.string().uuid().optional(),
        projectPhaseId: z.string().uuid().optional(),
        milestoneId: z.string().uuid().optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      if (!(await entityInWorkspace("project", input.projectId, workspaceId))) {
        return textResult({ error: "invalid_reference", message: "projectId does not exist in this workspace" });
      }
      if (
        input.projectPhaseId &&
        !(await entityInWorkspace("phase", input.projectPhaseId, workspaceId))
      ) {
        return textResult({ error: "invalid_reference", message: "projectPhaseId does not exist in this workspace" });
      }
      if (input.milestoneId && !(await entityInWorkspace("milestone", input.milestoneId, workspaceId))) {
        return textResult({ error: "invalid_reference", message: "milestoneId does not exist in this workspace" });
      }
      const assigneeErr = await memberReferenceError(workspaceId, input.assignedTo, "assignedTo");
      if (assigneeErr) return textResult(assigneeErr);

      const { id } = await createProjectTaskCore({
        workspaceId,
        userId,
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        priority: input.priority,
        assignedTo: input.assignedTo ?? null,
        projectPhaseId: input.projectPhaseId ?? null,
        milestoneId: input.milestoneId ?? null,
        source: "mcp",
      });

      return textResult({ created: { id } });
    },
  );

  server.registerTool(
    "complete_milestone",
    {
      description: "Mark a project milestone as complete. Logs a milestone_completed activity on the project's timeline.",
      inputSchema: { id: z.string().uuid() },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);
      const result = await completeMilestoneCore({ workspaceId, userId, id, source: "mcp" });
      if ("error" in result) return textResult({ error: "not_found", id });
      return textResult({ updated: result.updated });
    },
  );

  server.registerTool(
    "raise_project_risk",
    {
      description:
        "Raise a risk or blocker on a project. kind='blocker' has no likelihood (it's already happening); kind='risk' should include one. Logs a risk_raised activity.",
      inputSchema: {
        projectId: z.string().uuid(),
        kind: z.enum(PROJECT_RISK_KINDS),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(5000).optional(),
        severity: z.enum(PROJECT_RISK_SEVERITIES),
        likelihood: z.enum(PROJECT_RISK_LIKELIHOODS).optional(),
        ownerId: z.string().uuid().optional(),
        mitigation: z.string().trim().max(5000).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      if (!(await entityInWorkspace("project", input.projectId, workspaceId))) {
        return textResult({ error: "invalid_reference", message: "projectId does not exist in this workspace" });
      }
      const riskOwnerErr = await memberReferenceError(workspaceId, input.ownerId, "ownerId");
      if (riskOwnerErr) return textResult(riskOwnerErr);

      const { id } = await raiseRiskCore({
        workspaceId,
        userId,
        projectId: input.projectId,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
        severity: input.severity,
        likelihood: input.likelihood ?? null,
        ownerId: input.ownerId ?? null,
        mitigation: input.mitigation ?? null,
        source: "mcp",
      });

      return textResult({ created: { id } });
    },
  );

  server.registerTool(
    "resolve_project_risk",
    {
      description: "Resolve a previously-raised risk/blocker. Optional resolution note. Logs a risk_resolved activity.",
      inputSchema: {
        id: z.string().uuid(),
        resolution: z.string().trim().max(5000).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id, resolution }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);
      const result = await resolveRiskCore({
        workspaceId,
        userId,
        id,
        resolution: resolution ?? null,
        source: "mcp",
      });
      if ("error" in result) return textResult({ error: "not_found", id });
      return textResult({ updated: result.updated });
    },
  );

  server.registerTool(
    "list_overdue_project_work",
    {
      description:
        "Single-call snapshot of everything overdue across all projects: open tasks past their due date, and milestones past their due date that aren't complete. Use this to answer 'what's slipping?' style questions.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (_input, { authInfo }) => {
      const { workspaceId } = await requireMcpWorkspace(authInfo);
      const { overdueTasks, overdueMilestones } = await listOverdueProjectWork(workspaceId);
      return textResult({
        overdueTaskCount: overdueTasks.length,
        overdueMilestoneCount: overdueMilestones.length,
        overdueTasks,
        overdueMilestones,
      });
    },
  );
}
