import { z } from "zod";

export const DEAL_TYPES = ["engagement", "sale", "project", "retainer"] as const;
export const DEAL_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export type DealType = (typeof DEAL_TYPES)[number];
export type DealStage = (typeof DEAL_STAGES)[number];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  engagement: "Engagement",
  sale: "Sale",
  project: "Project",
  retainer: "Retainer",
};

export const dealFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  type: z.enum(DEAL_TYPES),
  stage: z.enum(DEAL_STAGES),
  valuePounds: z.coerce.number().min(0).max(1_000_000_000).optional().or(z.nan()),
  closeDate: z.string().trim().max(20).optional().or(z.literal("")),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  primaryContactId: z.string().uuid().optional().or(z.literal("")),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;
