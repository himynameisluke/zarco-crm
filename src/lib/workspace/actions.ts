"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_WORKSPACE_COOKIE } from "./current";
import { seedDemoWorkspace } from "./seed-demo";

/**
 * Switch the user's active workspace. Verifies membership before setting
 * the cookie (otherwise a forged form could let a user "switch" to a
 * workspace they don't belong to — getCurrentWorkspace would reject it
 * but better to fail fast at the switch point).
 */
export async function switchWorkspace(workspaceId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in");
  }

  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error("Not a member of that workspace");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: CURRENT_WORKSPACE_COOKIE,
    value: workspaceId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 1 year — workspace choice is sticky until the user changes it
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Creates a fresh demo workspace, makes the user the owner, seeds it with
 * realistic fake CRM data, sets the workspace cookie, and redirects to home.
 *
 * Refuses if the user already has a demo workspace — one per user. Delete
 * the existing one (UI not built yet) if you want to start over.
 */
export async function createDemoWorkspace(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in");
  }

  // Refuse if there's already a demo for this user — we don't want to seed
  // hundreds of fake records on accidental double-click.
  const existing = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .where(eq(workspaces.type, "demo"))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Demo workspace already exists for this user");
  }

  // Slug uses a short random suffix because the column is globally unique
  // (multiple users will eventually each have their own 'demo').
  const slug = `demo-${user.id.slice(0, 8)}`;

  const [newWorkspace] = await db
    .insert(workspaces)
    .values({
      name: "Demo workspace",
      slug,
      type: "demo",
      ownerId: user.id,
    })
    .returning({ id: workspaces.id });

  await db.insert(workspaceMembers).values({
    workspaceId: newWorkspace.id,
    userId: user.id,
    role: "owner",
  });

  // Populate. ~100 inserts across 7 tables, runs in <1s on the pooler.
  await seedDemoWorkspace({
    workspaceId: newWorkspace.id,
    userId: user.id,
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: CURRENT_WORKSPACE_COOKIE,
    value: newWorkspace.id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Lists the workspaces the current user belongs to. Used by the workspace
 * switcher UI (phase 2).
 */
export async function listMyWorkspaces() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      type: workspaces.type,
    })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .orderBy(workspaces.createdAt);
}
