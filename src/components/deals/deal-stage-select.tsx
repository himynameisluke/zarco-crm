"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  // Marking a deal lost asks WHY first — the one moment the reason is still
  // fresh. Skippable, but captured on the deal + timeline when given.
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const commit = (stage: DealStage, reason?: string) => {
    startTransition(async () => {
      await updateDealStage(dealId, stage, reason);
    });
  };

  return (
    <>
      <Select
        value={currentStage}
        onValueChange={(value) => {
          if (typeof value !== "string" || value === currentStage) return;
          if (value === "lost") {
            setLostDialogOpen(true);
            return;
          }
          commit(value as DealStage);
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

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark deal as lost</DialogTitle>
            <DialogDescription>
              Why was this deal lost? Recorded on the deal and its timeline —
              it&apos;s what makes win/loss reporting possible later.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            rows={3}
            placeholder="e.g. Went with a competitor on price"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                setLostDialogOpen(false);
                commit("lost");
              }}
            >
              Skip reason
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setLostDialogOpen(false);
                commit("lost", lostReason.trim() || undefined);
                setLostReason("");
              }}
            >
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
