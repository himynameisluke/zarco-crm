"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CONTRACT_BILLING_PERIODS,
  CONTRACT_PERIOD_LABELS,
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABELS,
  type ContractBillingPeriod,
  type ContractStatus,
} from "@/app/(app)/renewals/schema";

type ContractFormProps = {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  defaultValues?: {
    name?: string | null;
    organizationId?: string | null;
    dealId?: string | null;
    status?: ContractStatus | null;
    valuePence?: number | null;
    billingPeriod?: ContractBillingPeriod | null;
    startDate?: string | null;
    endDate?: string | null;
    autoRenew?: boolean | null;
    notes?: string | null;
  };
  organizationOptions: { id: string; name: string }[];
  dealOptions: { id: string; name: string }[];
  submitLabel?: string;
  cancelHref: string;
};

function penceToPoundsString(pence: number | null | undefined) {
  if (pence == null) return "";
  return (pence / 100).toFixed(2);
}

export function ContractForm({
  action,
  defaultValues,
  organizationOptions,
  dealOptions,
  submitLabel = "Save contract",
  cancelHref,
}: ContractFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contract</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. Acme — AI support retainer"
              defaultValue={defaultValues?.name ?? ""}
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={defaultValues?.status ?? "active"}>
              <SelectTrigger id="status" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CONTRACT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="autoRenew">Auto-renews</Label>
            <Select
              name="autoRenew"
              defaultValue={defaultValues?.autoRenew ? "yes" : "no"}
            >
              <SelectTrigger id="autoRenew" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No — needs an active renewal</SelectItem>
                <SelectItem value="yes">Yes — rolls over automatically</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="valuePounds">Value per period (£)</Label>
            <Input
              id="valuePounds"
              name="valuePounds"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              defaultValue={penceToPoundsString(defaultValues?.valuePence)}
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="billingPeriod">Billing period</Label>
            <Select
              name="billingPeriod"
              defaultValue={defaultValues?.billingPeriod ?? "monthly"}
            >
              <SelectTrigger id="billingPeriod" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_BILLING_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {CONTRACT_PERIOD_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="startDate">Start date *</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={defaultValues?.startDate ?? ""}
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="endDate">Renewal date *</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              required
              defaultValue={defaultValues?.endDate ?? ""}
              disabled={pending}
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="organizationId">Organization</Label>
            <Select
              name="organizationId"
              defaultValue={defaultValues?.organizationId ?? ""}
            >
              <SelectTrigger id="organizationId" disabled={pending}>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {organizationOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No organizations yet
                  </div>
                ) : (
                  organizationOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="dealId">Source deal (the won deal this came from)</Label>
            <Select name="dealId" defaultValue={defaultValues?.dealId ?? ""}>
              <SelectTrigger id="dealId" disabled={pending}>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {dealOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No deals yet
                  </div>
                ) : (
                  dealOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={defaultValues?.notes ?? ""}
              disabled={pending}
            />
          </div>
        </CardContent>
      </Card>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" type="button" asChild disabled={pending}>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
