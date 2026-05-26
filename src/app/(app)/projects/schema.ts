import { z } from "zod";

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
