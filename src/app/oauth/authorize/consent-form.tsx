"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { decideConsent } from "./actions";

type ConsentFormProps = {
  clientName: string;
  userEmail: string;
  scope: string;
  hiddenFields: Record<string, string | null>;
};

export function ConsentForm({
  clientName,
  userEmail,
  scope,
  hiddenFields,
}: ConsentFormProps) {
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await decideConsent(formData);
    });
  }

  return (
    <form action={submit} className="grid gap-6">
      {Object.entries(hiddenFields).map(([key, value]) =>
        value === null ? null : (
          <input key={key} type="hidden" name={key} value={value} />
        ),
      )}

      <div className="space-y-2">
        <p className="text-sm">
          <span className="font-semibold">{clientName}</span> wants to access your
          Zarco CRM as <span className="font-semibold">{userEmail}</span>.
        </p>
        <p className="text-sm text-muted-foreground">
          Scope: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{scope}</code>{" "}
          — read and write access to your CRM via MCP. High-stakes actions
          (sending quotes, sending emails, deleting records) will still ask for
          your confirmation each time.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          name="decision"
          value="deny"
          type="submit"
          variant="outline"
          disabled={pending}
        >
          Deny
        </Button>
        <Button name="decision" value="allow" type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Allow
        </Button>
      </div>
    </form>
  );
}
