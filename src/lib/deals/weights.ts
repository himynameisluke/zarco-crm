import type { DealStage } from "@/app/(app)/deals/schema";

/**
 * Probability weight per pipeline stage — used for the weighted forecast on
 * BOTH the dashboard and the /reports forecast, so the two can never drift.
 */
export const STAGE_WEIGHTS: Record<DealStage, number> = {
  lead: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
  won: 1,
  lost: 0,
};
