"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { oauthClients } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

export async function revokeOAuthClient(clientId: string) {
  await requireUser();
  // Deleting the client cascades to oauth_access_tokens + oauth_authorization_codes
  // via the FK onDelete: 'cascade' on those tables.
  await db.delete(oauthClients).where(eq(oauthClients.id, clientId));
  revalidatePath("/settings/mcp");
}
