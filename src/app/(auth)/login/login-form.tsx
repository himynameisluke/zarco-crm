"use client";

import { useActionState, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { signIn, signUp, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = null;

type Mode = "sign-in" | "sign-up";

export function LoginForm({ next }: { next: string | null }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  const successMessage =
    state && "success" in state && state.success ? state.message : null;
  const errorMessage = state && "error" in state ? state.error : null;

  if (successMessage) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheck className="h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">{successMessage}</p>
        <button
          type="button"
          className="text-xs underline text-muted-foreground hover:text-foreground"
          onClick={() => setMode("sign-in")}
        >
          Back to sign in
        </button>
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
          autoComplete="email"
          required
          disabled={pending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={mode === "sign-up" ? 8 : undefined}
          required
          disabled={pending}
        />
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {mode === "sign-in" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground self-center"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        disabled={pending}
      >
        {mode === "sign-in"
          ? "No account yet? Create one"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
