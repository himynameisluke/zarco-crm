"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { sendMagicLink } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = { error?: string; success?: boolean } | null;

const initialState: State = null;

export function LoginForm({ next }: { next: string | null }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheck className="h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          Check your inbox for a sign-in link.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@zarco.uk"
          required
          disabled={pending}
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send magic link
      </Button>
    </form>
  );
}
