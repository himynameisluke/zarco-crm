import "server-only";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { contracts, deals } from "@/lib/db/schema";
import type {
  ForecastResult,
  FunnelResult,
  RecurringResult,
  ReportPeriod,
  WinLossResult,
} from "./types";
import { computeForecast } from "./forecast";
import { computeWinLoss, type WinLossDealRow } from "./win-loss";
import { computeFunnel } from "./funnel";
import { computeRecurring, type ContractRow } from "./recurring";

export async function forecastByMonth(workspaceId: string): Promise<ForecastResult> {
  const rows = await db
    .select({ stage: deals.stage, valuePence: deals.valuePence, closeDate: deals.closeDate })
    .from(deals)
    .where(eq(deals.workspaceId, workspaceId));
  return computeForecast(rows, new Date());
}

export async function winLoss(workspaceId: string, period: ReportPeriod): Promise<WinLossResult> {
  const rows = await db
    .select({
      stage: deals.stage,
      stageChangedAt: deals.stageChangedAt,
      lostReason: deals.lostReason,
    })
    .from(deals)
    .where(and(eq(deals.workspaceId, workspaceId), inArray(deals.stage, ["won", "lost"])));
  return computeWinLoss(rows as WinLossDealRow[], new Date(), period);
}

export async function pipelineFunnel(workspaceId: string): Promise<FunnelResult> {
  const rows = await db
    .select({ stage: deals.stage })
    .from(deals)
    .where(eq(deals.workspaceId, workspaceId));
  return computeFunnel(rows);
}

export async function recurringRevenue(
  workspaceId: string,
  period: ReportPeriod,
): Promise<RecurringResult> {
  const rows = await db
    .select({
      status: contracts.status,
      valuePence: contracts.valuePence,
      billingPeriod: contracts.billingPeriod,
      endDate: contracts.endDate,
      updatedAt: contracts.updatedAt,
    })
    .from(contracts)
    .where(eq(contracts.workspaceId, workspaceId));
  return computeRecurring(rows as ContractRow[], new Date(), period);
}
