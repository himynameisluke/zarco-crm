import { z } from "zod";
import {
  PROJECT_HEALTHS,
  PROJECT_RISK_KINDS,
  PROJECT_RISK_LIKELIHOODS,
  PROJECT_RISK_SEVERITIES,
  PROJECT_TEMPLATE_ITEM_KINDS,
  PROJECT_TYPES,
  TASK_PRIORITIES,
} from "@/lib/projects/labels";

export const PROJECT_STATUSES = [
  "not_started",
  "in_progress",
  "on_hold",
  "completed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
};

export const PROJECT_STATUS_ACCENT: Record<ProjectStatus, string> = {
  not_started: "rgba(245,241,234,0.40)",
  in_progress: "oklch(0.78 0.20 145)",
  on_hold: "oklch(0.82 0.14 70)",
  completed: "oklch(0.78 0.18 145)",
};

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  status: z.enum(PROJECT_STATUSES),
  dealId: z.string().uuid().optional().or(z.literal("")),
  startDate: z.string().trim().max(20).optional().or(z.literal("")),
  endDate: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

// ---------------------------------------------------------------------------
// Project management extensions — wizard create + rich detail-page update.
// These are ADDITIVE: the schema/actions above stay exactly as they were so
// the existing /projects/new + /projects/[id]/edit pages keep working
// untouched. Future UI (wizard, workspace detail page) uses these instead.
// ---------------------------------------------------------------------------

export const projectWizardSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  dealId: z.string().uuid().optional().or(z.literal("")),
  ownerId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUSES).default("not_started"),
  health: z.enum(PROJECT_HEALTHS).default("on_track"),
  projectType: z.enum(PROJECT_TYPES).optional().or(z.literal("")),
  description: z.string().trim().max(10000).optional().or(z.literal("")),
  successCriteria: z.string().trim().max(10000).optional().or(z.literal("")),
  startDate: z.string().trim().max(20).optional().or(z.literal("")),
  endDate: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  templateId: z.string().uuid().optional().or(z.literal("")),
});

export type ProjectWizardValues = z.infer<typeof projectWizardSchema>;

export const projectDetailsUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  health: z.enum(PROJECT_HEALTHS).optional(),
  currentPhaseId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  projectType: z.enum(PROJECT_TYPES).nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  successCriteria: z.string().trim().max(10000).nullable().optional(),
  progressManual: z.number().int().min(0).max(100).nullable().optional(),
  startDate: z.string().trim().max(20).nullable().optional(),
  endDate: z.string().trim().max(20).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export type ProjectDetailsUpdateValues = z.infer<typeof projectDetailsUpdateSchema>;

export const projectTaskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  dueAt: z.string().trim().optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES).default("normal"),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
  projectPhaseId: z.string().uuid().optional().or(z.literal("")),
  milestoneId: z.string().uuid().optional().or(z.literal("")),
});

export type ProjectTaskFormValues = z.infer<typeof projectTaskFormSchema>;

export const projectMilestoneFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  dueDate: z.string().trim().max(20).optional().or(z.literal("")),
  phaseId: z.string().uuid().optional().or(z.literal("")),
  ownerId: z.string().uuid().optional().or(z.literal("")),
});

export type ProjectMilestoneFormValues = z.infer<typeof projectMilestoneFormSchema>;

export const projectRiskFormSchema = z.object({
  kind: z.enum(PROJECT_RISK_KINDS),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  severity: z.enum(PROJECT_RISK_SEVERITIES),
  likelihood: z.enum(PROJECT_RISK_LIKELIHOODS).optional().or(z.literal("")),
  ownerId: z.string().uuid().optional().or(z.literal("")),
  mitigation: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type ProjectRiskFormValues = z.infer<typeof projectRiskFormSchema>;

export const projectLinkFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  url: z.string().trim().url("Enter a valid URL").max(2000),
  kind: z.string().trim().max(50).optional().or(z.literal("")),
});

export type ProjectLinkFormValues = z.infer<typeof projectLinkFormSchema>;

export const projectTemplateItemSchema = z.object({
  kind: z.enum(PROJECT_TEMPLATE_ITEM_KINDS),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  phaseName: z.string().trim().max(200).optional().or(z.literal("")),
  offsetDays: z.coerce.number().int().min(0).max(3650).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const projectTemplateFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  projectType: z.enum(PROJECT_TYPES).optional().or(z.literal("")),
});

export type ProjectTemplateFormValues = z.infer<typeof projectTemplateFormSchema>;
