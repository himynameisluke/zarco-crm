import { z } from "zod";

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
};

export const CAMPAIGN_STATUS_CHIP: Record<CampaignStatus, string> = {
  draft: "--mute",
  scheduled: "--info",
  sending: "--warn",
  sent: "--ok",
};

export const campaignFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  subject: z.string().trim().min(1, "Subject is required").max(500),
  bodyHtml: z.string().trim().min(1, "Body is required").max(100_000),
  fromEmail: z.string().trim().email("Enter a valid from email").max(200),
  fromName: z.string().trim().max(120).optional().or(z.literal("")),
  targetOrganizationId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .describe("If set, send to every contact at this organization. Otherwise no recipients are picked yet."),
});

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;
