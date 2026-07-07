"use client";

import { useActionForm } from "@/lib/use-action-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/app/(app)/projects/schema";

type ProjectFormProps = {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  defaultValues?: {
    name?: string | null;
    status?: ProjectStatus | null;
    dealId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
  };
  dealOptions: { id: string; name: string }[];
  submitLabel?: string;
  cancelHref: string;
};

export function ProjectForm({
  action,
  defaultValues,
  dealOptions,
  submitLabel = "Save project",
  cancelHref,
}: ProjectFormProps) {
  const { state, pending, onSubmit } = useActionForm(action);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
              defaultValue={defaultValues?.name ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={defaultValues?.status ?? "not_started"}>
              <SelectTrigger id="status" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dealId">Linked deal</Label>
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
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={defaultValues?.startDate ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">End</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={defaultValues?.endDate ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={5}
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
