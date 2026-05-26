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
import { revokeOAuthClient } from "@/app/(app)/settings/mcp/actions";

export function RevokeClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Revoke
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke {clientName}?</DialogTitle>
          <DialogDescription>
            This deletes the client registration and invalidates every access
            token and authorization code issued to it. The client will need to
            re-register and complete the OAuth flow again to reconnect.
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
                await revokeOAuthClient(clientId);
                setOpen(false);
              });
            }}
          >
            Revoke client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
