"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const magicLinkSchema = z.object({
  email: z.string().email("Enter a valid email"),
  next: z.string().startsWith("/").max(2000).optional(),
});

export async function sendMagicLink(_: unknown, formData: FormData) {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const callbackUrl = new URL(`${origin}/auth/callback`);
  if (parsed.data.next) callbackUrl.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
