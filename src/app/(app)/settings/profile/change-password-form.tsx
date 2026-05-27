"use client";

import { useActionState, useRef, useEffect } from "react";
import { Loader2, Check } from "lucide-react";

import { updatePassword, type UpdatePasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: UpdatePasswordState = null;

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );

  const isSuccess = state && "success" in state && state.success;
  const errorMessage = state && "error" in state ? state.error : null;

  // Reset the form on success so the temp password isn't lingering.
  useEffect(() => {
    if (isSuccess) formRef.current?.reset();
  }, [isSuccess]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 max-w-md">
      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
      {isSuccess ? (
        <p
          className="text-sm flex items-center gap-1.5"
          style={{ color: "oklch(0.85 0.18 145)" }}
        >
          <Check size={14} />
          Password updated.
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </div>
    </form>
  );
}
