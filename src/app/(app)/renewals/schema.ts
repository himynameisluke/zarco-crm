import { z } from "zod";

export const CONTRACT_STATUSES = [
  "active",
  "renewed",
  "lapsed",
  "cancelled",
] as const;

export const CONTRACT_BILLING_PERIODS = [
  "monthly",
  "quarterly",
  "annual",
  "one_off",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
export type ContractBillingPeriod = (typeof CONTRACT_BILLING_PERIODS)[number];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: "Active",
  renewed: "Renewed",
  lapsed: "Lapsed",
  cancelled: "Cancelled",
};

export const CONTRACT_STATUS_CHIP: Record<ContractStatus, string> = {
  active: "--ok",
  renewed: "--info",
  lapsed: "--mute",
  cancelled: "--danger",
};

export const CONTRACT_PERIOD_LABELS: Record<ContractBillingPeriod, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  one_off: "One-off",
};

/** Periods per year — used to annualise a contract's per-period value. */
export const PERIODS_PER_YEAR: Record<ContractBillingPeriod, number> = {
  monthly: 12,
  quarterly: 4,
  annual: 1,
  one_off: 1,
};

export const contractFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  dealId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(CONTRACT_STATUSES),
  valuePounds: z.coerce.number().min(0).max(1_000_000_000).optional().or(z.nan()),
  billingPeriod: z.enum(CONTRACT_BILLING_PERIODS),
  startDate: z.string().trim().min(1, "Start date is required").max(20),
  endDate: z.string().trim().min(1, "Renewal date is required").max(20),
  autoRenew: z.enum(["yes", "no"]),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;
