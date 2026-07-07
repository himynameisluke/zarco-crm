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

type Option = { id: string; name: string; contactCount: number };

type CampaignFormProps = {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  defaultValues?: {
    name?: string | null;
    subject?: string | null;
    bodyHtml?: string | null;
    fromEmail?: string | null;
    fromName?: string | null;
    targetOrganizationId?: string | null;
  };
  organizationOptions: Option[];
  defaultFromEmail: string;
  submitLabel?: string;
  cancelHref: string;
};

export function CampaignForm({
  action,
  defaultValues,
  organizationOptions,
  defaultFromEmail,
  submitLabel = "Save campaign",
  cancelHref,
}: CampaignFormProps) {
  const { state, pending, onSubmit } = useActionForm(action);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="name">Name (internal) *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. Acme Q3 nurture · v1"
              defaultValue={defaultValues?.name ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              name="subject"
              required
              placeholder="What recipients see in their inbox"
              defaultValue={defaultValues?.subject ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fromEmail">From email *</Label>
            <Input
              id="fromEmail"
              name="fromEmail"
              type="email"
              required
              defaultValue={defaultValues?.fromEmail ?? defaultFromEmail}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fromName">From name</Label>
            <Input
              id="fromName"
              name="fromName"
              placeholder="e.g. Luke at Zarco"
              defaultValue={defaultValues?.fromName ?? ""}
              disabled={pending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="targetOrganizationId">Send to every contact at</Label>
            <Select
              name="targetOrganizationId"
              defaultValue={defaultValues?.targetOrganizationId ?? ""}
            >
              <SelectTrigger id="targetOrganizationId" disabled={pending}>
                <SelectValue placeholder="Pick an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizationOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No organizations with contacts yet
                  </div>
                ) : (
                  organizationOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                      <span style={{ color: "var(--ink-4)", marginLeft: 6 }}>
                        {o.contactCount} contact{o.contactCount === 1 ? "" : "s"}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p style={{ fontSize: 11.5, color: "var(--ink-4)", margin: 0 }}>
              v1 picks recipients by organization. Multi-org segments, filters,
              and saved audiences come later.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            name="bodyHtml"
            rows={14}
            placeholder={
              "Hi {{firstName}},\n\n…\n\nLuke"
            }
            defaultValue={defaultValues?.bodyHtml ?? ""}
            disabled={pending}
            style={{ fontFamily: "var(--code)", fontSize: 13 }}
          />
          <p style={{ fontSize: 11.5, color: "var(--ink-4)", margin: 0 }}>
            HTML or plain text. Templating + per-recipient personalisation comes
            with the Resend integration.
          </p>
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
