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
import { deleteContract } from "@/app/(app)/renewals/actions";

export function DeleteContractButton({
  contractId,
  contractName,
}: {
  contractId: string;
  contractName: string;
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
          <DialogTitle>Delete {contractName}?</DialogTitle>
          <DialogDescription>
            This removes the contract. Any linked renewal deal stays in the
            pipeline. Cannot be undone.
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
                await deleteContract(contractId);
              });
            }}
          >
            Delete contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
