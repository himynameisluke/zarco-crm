"use client";

import { useActionForm } from "@/lib/use-action-form";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OrganizationFormProps = {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  defaultValues?: {
    name?: string | null;
    domain?: string | null;
    website?: string | null;
    industry?: string | null;
    employeeCount?: number | null;
    notes?: string | null;
  };
  submitLabel?: string;
  cancelHref: string;
};

export function OrganizationForm({
  action,
  defaultValues,
  submitLabel = "Save organization",
  cancelHref,
}: OrganizationFormProps) {
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
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              name="domain"
              placeholder="acme.com"
              defaultValue={defaultValues?.domain ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://acme.com"
              defaultValue={defaultValues?.website ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              name="industry"
              placeholder="SaaS, Manufacturing, etc."
              defaultValue={defaultValues?.industry ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="employeeCount">Employees</Label>
            <Input
              id="employeeCount"
              name="employeeCount"
              type="number"
              min={0}
              defaultValue={defaultValues?.employeeCount ?? ""}
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
