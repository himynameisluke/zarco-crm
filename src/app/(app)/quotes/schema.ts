import { z } from "zod";

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

export const QUOTE_STATUS_CHIP: Record<QuoteStatus, string> = {
  draft: "--mute",
  sent: "--info",
  viewed: "--info",
  accepted: "--ok",
  declined: "--danger",
  expired: "--mute",
};

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(500),
  quantity: z.coerce.number().min(0).max(100_000),
  unitPricePounds: z.coerce.number().min(0).max(10_000_000),
});

export const quoteFormSchema = z.object({
  // Required. DB enforces NOT NULL + restrict — these messages mirror the
  // form labels so the user knows what to fix.
  dealId: z.string().uuid("Select a deal for this quote"),
  organizationId: z.string().uuid("Select an organization for this quote"),
  contactId: z.string().uuid().optional().or(z.literal("")),
  currency: z.string().trim().length(3).default("GBP"),
  taxRate: z.coerce.number().min(0).max(1).default(0),
  validUntil: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;
