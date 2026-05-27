"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Password auth
// =============================================================================
// Earlier we used magic-link sign-in via supabase.auth.signInWithOtp. That
// relies on Supabase's "Site URL" config to build the email link — and the
// link is baked at send time, which makes per-environment redirects awkward
// (dev vs Vercel vs custom domain all share one Site URL). Switched to
// password auth so sign-in is fully in-app and doesn't bounce through email.
//
// Sign-up auto-confirms the email on the server only if Supabase's "Confirm
// email" setting is OFF. Keep that toggle off in the Supabase dashboard for
// frictionless solo use; re-enable when you have a team and want to gate
// sign-ups.

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  next: z.string().startsWith("/").max(2000).optional(),
});

export type AuthFormState =
  | { error: string }
  | { success: true; message?: string }
  | null;

function nextPath(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export async function signIn(
  _: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Supabase returns "Invalid login credentials" for both wrong email and
    // wrong password — preserve that vagueness (good security practice).
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(nextPath(formData.get("next")));
}

export async function signUp(
  _: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // If Confirm Email is ON in Supabase, the user is created but no session is
  // issued — they need to click a confirmation link first. We surface that as
  // a success message rather than redirecting.
  if (!data.session) {
    return {
      success: true,
      message:
        "Account created. Check your email for a confirmation link before signing in.",
    };
  }

  // Confirm Email is OFF — Supabase auto-issued a session, sign-in is done.
  revalidatePath("/", "layout");
  redirect(nextPath(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
