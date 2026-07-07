"use client";

import { useTransition } from "react";
import { SquareKanban } from "lucide-react";
import { toast } from "sonner";

import { createRenewalDeal } from "@/app/(app)/renewals/actions";

/**
 * One-click "spawn the renewal opportunity" — creates a pre-filled deal
 * (annualised value, close date = renewal date) and jumps to it.
 */
export function CreateRenewalDealButton({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await createRenewalDeal(contractId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <SquareKanban size={12} />
      Create renewal deal
    </button>
  );
}
