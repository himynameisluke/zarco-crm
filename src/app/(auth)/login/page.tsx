"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { sendMagicLink } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type State = { error?: string; success?: boolean } | null;

const initialState: State = null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to Zarco CRM</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a magic link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MailCheck className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">
              Check your inbox for a sign-in link.
            </p>
          </div>
        ) : (
          <form action={formAction} className="grid gap-4">
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
        )}
      </CardContent>
    </Card>
  );
}
