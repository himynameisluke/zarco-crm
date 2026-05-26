"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteCampaign } from "@/app/(app)/campaigns/actions";

export function DeleteCampaignButton({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {campaignName}?</DialogTitle>
          <DialogDescription>
            Removes the campaign and every queued/sent record. If the campaign
            has already been sent, recipients keep their emails (this only
            deletes our side of the record). Cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await deleteCampaign(campaignId);
              });
            }}
          >
            Delete campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
