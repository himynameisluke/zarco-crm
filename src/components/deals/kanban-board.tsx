import Link from "next/link";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  type DealStage,
} from "@/app/(app)/deals/schema";

type Deal = {
  id: string;
  name: string;
  stage: DealStage;
  type: string;
  valuePence: number | null;
  currency: string;
  closeDate: string | null;
  organizationName: string | null;
};

function formatMoney(pence: number | null, currency: string) {
  if (pence == null) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

function stageTotal(deals: Deal[]) {
  return deals.reduce((sum, d) => sum + (d.valuePence ?? 0), 0);
}

const STAGE_TINTS: Record<DealStage, string> = {
  lead: "bg-slate-50 dark:bg-slate-900/40",
  qualified: "bg-blue-50 dark:bg-blue-950/30",
  proposal: "bg-amber-50 dark:bg-amber-950/30",
  negotiation: "bg-purple-50 dark:bg-purple-950/30",
  won: "bg-emerald-50 dark:bg-emerald-950/30",
  lost: "bg-rose-50 dark:bg-rose-950/30",
};

export function KanbanBoard({ deals }: { deals: Deal[] }) {
  const grouped = DEAL_STAGES.map((stage) => ({
    stage,
    items: deals.filter((d) => d.stage === stage),
  }));

  return (
    <div className="grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {grouped.map(({ stage, items }) => {
        const total = stageTotal(items);
        const currency = items[0]?.currency ?? "GBP";
        return (
          <div
            key={stage}
            className={cn(
              "flex flex-col rounded-lg border",
              STAGE_TINTS[stage],
            )}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div>
                <h2 className="text-sm font-semibold">{DEAL_STAGE_LABELS[stage]}</h2>
                <p className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "deal" : "deals"}
                  {total > 0 ? ` · ${formatMoney(total, currency)}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-2 pt-0">
              {items.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Empty
                </p>
              ) : (
                items.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="rounded-md border bg-background p-3 text-sm shadow-sm transition hover:border-foreground/30"
                  >
                    <p className="font-medium leading-tight">{deal.name}</p>
                    {deal.organizationName ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {deal.organizationName}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {deal.type}
                      </Badge>
                      {deal.valuePence != null ? (
                        <span className="text-xs font-medium">
                          {formatMoney(deal.valuePence, deal.currency)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
