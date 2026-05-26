"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_TYPES,
  DEAL_TYPE_LABELS,
  type DealStage,
  type DealType,
} from "@/app/(app)/deals/schema";

type DealFormProps = {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  defaultValues?: {
    name?: string | null;
    type?: DealType | null;
    stage?: DealStage | null;
    valuePence?: number | null;
    closeDate?: string | null;
    organizationId?: string | null;
    primaryContactId?: string | null;
  };
  organizationOptions: { id: string; name: string }[];
  contactOptions: { id: string; name: string }[];
  submitLabel?: string;
  cancelHref: string;
};

function penceToPoundsString(pence: number | null | undefined) {
  if (pence == null) return "";
  return (pence / 100).toFixed(2);
}

export function DealForm({
  action,
  defaultValues,
  organizationOptions,
  contactOptions,
  submitLabel = "Save deal",
  cancelHref,
}: DealFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. Acme — Q3 strategy engagement"
              defaultValue={defaultValues?.name ?? ""}
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={defaultValues?.type ?? "sale"}>
              <SelectTrigger id="type" disabled={pending}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DEAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DEAL_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stage">Stage</Label>
            <Select name="stage" defaultValue={defaultValues?.stage ?? "lead"}>
              <SelectTrigger id="stage" disabled={pending}>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DEAL_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="valuePounds">Value (£)</Label>
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
            <Label htmlFor="closeDate">Expected close</Label>
            <Input
              id="closeDate"
              name="closeDate"
              type="date"
              defaultValue={defaultValues?.closeDate ?? ""}
              disabled={pending}
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="organizationId">Organization</Label>
            <Select name="organizationId" defaultValue={defaultValues?.organizationId ?? ""}>
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
            <Label htmlFor="primaryContactId">Primary contact</Label>
            <Select name="primaryContactId" defaultValue={defaultValues?.primaryContactId ?? ""}>
              <SelectTrigger id="primaryContactId" disabled={pending}>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {contactOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No contacts yet
                  </div>
                ) : (
                  contactOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
