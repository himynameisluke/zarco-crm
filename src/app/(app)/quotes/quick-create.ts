"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { contacts, deals, organizations } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Quick-create server actions for the quote form combobox
// =============================================================================
// Minimal create-by-name endpoints used inline from EntityCombobox. They mirror
// the full create flows but only ask for the absolute minimum (a name) so the
// user can keep momentum mid-quote.
//
// Each returns a `ComboboxItem`-shaped object so the combobox can immediately
// select the newly-created row.

type Item = { id: string; label: string; sublabel?: string };

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

// ---- Organization -----------------------------------------------------------

const orgNameSchema = z.string().trim().min(1).max(200);

export async function quickCreateOrganization(name: string): Promise<Item> {
  const parsed = orgNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid name");
  }

  const userId = await requireUserId();
  const [row] = await db
    .insert(organizations)
    .values({
      name: parsed.data,
      ownerId: userId,
    })
    .returning({ id: organizations.id, name: organizations.name });

  revalidatePath("/quotes");
  revalidatePath("/organizations");
  return { id: row.id, label: row.name };
}

// ---- Contact ----------------------------------------------------------------

const contactQuickSchema = z.object({
  name: z.string().trim().min(1).max(200),
  organizationId: z.string().uuid().optional(),
});

/**
 * Splits "John Smith" → firstName: John, lastName: Smith. Single-word names
 * go to firstName only. Anything beyond two words collapses into lastName.
 */
function splitName(name: string): { first: string | null; last: string | null } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export async function quickCreateContact(
  name: string,
  organizationId?: string,
): Promise<Item> {
  const parsed = contactQuickSchema.safeParse({ name, organizationId });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const userId = await requireUserId();
  const { first, last } = splitName(parsed.data.name);

  const [row] = await db
    .insert(contacts)
    .values({
      firstName: first,
      lastName: last,
      organizationId: parsed.data.organizationId ?? null,
      ownerId: userId,
    })
    .returning({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    });

  const label = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();

  revalidatePath("/quotes");
  revalidatePath("/contacts");
  return { id: row.id, label: label || "Unnamed contact" };
}

// ---- Deal -------------------------------------------------------------------

const dealQuickSchema = z.object({
  name: z.string().trim().min(1).max(200),
  organizationId: z.string().uuid().optional(),
});

export async function quickCreateDeal(
  name: string,
  organizationId?: string,
): Promise<Item> {
  const parsed = dealQuickSchema.safeParse({ name, organizationId });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const userId = await requireUserId();
  const [row] = await db
    .insert(deals)
    .values({
      name: parsed.data.name,
      stage: "lead",
      type: "sale",
      organizationId: parsed.data.organizationId ?? null,
      ownerId: userId,
    })
    .returning({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
    });

  revalidatePath("/quotes");
  revalidatePath("/deals");
  return { id: row.id, label: row.name, sublabel: row.stage };
}
