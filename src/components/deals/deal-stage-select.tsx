"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  type DealStage,
} from "@/app/(app)/deals/schema";
import { updateDealStage } from "@/app/(app)/deals/actions";

export function DealStageSelect({
  dealId,
  currentStage,
}: {
  dealId: string;
  currentStage: DealStage;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={currentStage}
      onValueChange={(value) => {
        if (typeof value !== "string") return;
        startTransition(async () => {
          await updateDealStage(dealId, value);
        });
      }}
    >
      <SelectTrigger className="w-40" disabled={pending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DEAL_STAGES.map((s) => (
          <SelectItem key={s} value={s}>
            {DEAL_STAGE_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
