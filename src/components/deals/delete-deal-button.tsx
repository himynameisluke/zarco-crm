"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { deleteDeal } from "@/app/(app)/deals/actions";

export function DeleteDealButton({
  dealId,
  dealName,
}: {
  dealId: string;
  dealName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {dealName}?</DialogTitle>
          <DialogDescription>
            Removes the deal. Linked activities and quotes are preserved but
            unlinked. Cannot be undone.
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
                const result = await deleteDeal(dealId);
                if (result?.error) {
                  toast.error(result.error);
                  setOpen(false);
                }
              });
            }}
          >
            Delete deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
