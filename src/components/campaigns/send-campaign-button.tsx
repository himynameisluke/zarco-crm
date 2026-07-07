"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendCampaignStub } from "@/app/(app)/campaigns/actions";

export function SendCampaignButton({
  campaignId,
  recipientCount,
}: {
  campaignId: string;
  recipientCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const disabled = recipientCount === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="btn btn-primary btn-sm"
        disabled={disabled}
        style={disabled ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
      >
        <Send size={12} />
        Send
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Send to {recipientCount} recipient{recipientCount === 1 ? "" : "s"}?
          </DialogTitle>
          <DialogDescription>
            Resend isn&apos;t wired yet, so this won&apos;t actually deliver any
            email. It will transition the campaign to <strong>sent</strong> and
            mark every queued recipient as sent so you can see the state flow.
            When you add a Resend API key the same action will swap the
            no-op for real delivery.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={pending || disabled}
            onClick={() => {
              startTransition(async () => {
                const result = await sendCampaignStub(campaignId);
                if (result?.error) toast.error(result.error);
                setOpen(false);
              });
            }}
          >
            <Send className="h-3.5 w-3.5" />
            Send (stub)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
