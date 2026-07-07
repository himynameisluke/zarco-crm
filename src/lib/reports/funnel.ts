import { DEAL_STAGE_LABELS, type DealStage } from "@/app/(app)/deals/schema";
import type { FunnelResult } from "./types";

export type FunnelDealRow = { stage: DealStage };

// The linear funnel excludes 'lost' (a terminal side-exit, not a step).
const FUNNEL_ORDER: DealStage[] = ["lead", "qualified", "proposal", "negotiation", "won"];

export function computeFunnel(rows: FunnelDealRow[]): FunnelResult {
  const counts = new Map<DealStage, number>();
  for (const row of rows) counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);

  const stages = FUNNEL_ORDER.map((stage, i) => {
    const count = counts.get(stage) ?? 0;
    const prevCount = i === 0 ? null : counts.get(FUNNEL_ORDER[i - 1]) ?? 0;
    const conversionFromPrev =
      prevCount === null || prevCount === 0 ? null : count / prevCount;
    return { stage, label: DEAL_STAGE_LABELS[stage], count, conversionFromPrev };
  });

  let biggestDrop: FunnelResult["biggestDrop"] = null;
  for (let i = 1; i < stages.length; i++) {
    const c = stages[i].conversionFromPrev;
    if (c === null) continue;
    if (biggestDrop === null || c < biggestDrop.conversion) {
      biggestDrop = { from: stages[i - 1].label, to: stages[i].label, conversion: c };
    }
  }

  return { stages, lostCount: counts.get("lost") ?? 0, biggestDrop };
}
