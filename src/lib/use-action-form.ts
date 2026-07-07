"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Wrapper around useActionState for create/edit forms that PRESERVE their
 * input on a validation error.
 *
 * React 19 automatically resets an uncontrolled form's fields after a
 * `<form action={fn}>` submission — including when the action returns a
 * validation error. That wiped everything the user typed and forced a full
 * re-entry (audit finding C17).
 *
 * The fix: submit via onSubmit + preventDefault and dispatch the action
 * ourselves. Because the native `action`-prop submission never happens,
 * React does no auto-reset, so the entered values stay put on error. Native
 * `required` / input validation still runs first (the browser blocks submit
 * and onSubmit never fires), so nothing about client validation changes.
 *
 * These forms redirect on success, so there's no case where we'd WANT the
 * reset — inline composers that clear-on-success keep using useActionState
 * with the action prop directly.
 */
type FormResult = { error?: string } | void;
type FormAction = (
  state: FormResult | null,
  payload: FormData,
) => FormResult | Promise<FormResult>;

export function useActionForm(action: FormAction) {
  const [state, formAction, isActionPending] = useActionState(action, null);
  const [isTransitionPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return {
    // Cast away the `void` arm so callers get a clean `state?.error`.
    state: state as { error?: string } | null,
    pending: isActionPending || isTransitionPending,
    onSubmit,
  };
}
