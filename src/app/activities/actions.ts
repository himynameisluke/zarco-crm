"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";

const SUBJECT_TYPES = ["contact", "organization", "deal", "project"] as const;
const LOGGABLE_TYPES = ["note", "call", "meeting", "email"] as const;

const composerSchema = z.object({
  subjectType: z.enum(SUBJECT_TYPES),
  subjectId: z.string().uuid(),
  type: z.enum(LOGGABLE_TYPES),
  subject: z.string().trim().min(1, "Add a brief headline").max(500),
  body: z.string().trim().max(50000).optional().or(z.literal("")),
});

export async function logManualActivity(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const parsed = composerSchema.safeParse({
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
    type: formData.get("type"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // The subject must belong to this workspace — activities.subjectId has no
  // FK, and RLS is bypassed, so an unchecked id would let a forged request
  // pin an activity onto another tenant's record.
  const subjectOk = await entityInWorkspace(
    parsed.data.subjectType,
    parsed.data.subjectId,
    workspace.id,
  );
  if (!subjectOk) {
    return { error: "Record not found in this workspace" };
  }

  await db.insert(activities).values({
    workspaceId: workspace.id,
    type: parsed.data.type,
    source: "manual",
    subjectType: parsed.data.subjectType,
    subjectId: parsed.data.subjectId,
    subject: parsed.data.subject,
    body: parsed.data.body && parsed.data.body.length > 0 ? parsed.data.body : null,
    createdBy: user.id,
  });

  revalidatePath(`/${parsed.data.subjectType === "organization" ? "organizations" : `${parsed.data.subjectType}s`}/${parsed.data.subjectId}`);
  revalidatePath("/activity");
  revalidatePath("/");

  return { success: true };
}
