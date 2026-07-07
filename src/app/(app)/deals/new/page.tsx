import { desc, eq } from "drizzle-orm";
import { SquareKanban } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { getWorkspaceMembers } from "@/lib/workspace/members";
import { Topbar } from "@/components/nav/topbar";
import { DealForm } from "@/components/deals/deal-form";
import { createDeal } from "../actions";
import { DEAL_STAGES, type DealStage } from "../schema";

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email || "Unnamed";
}

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; organizationId?: string }>;
}) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { stage, organizationId } = await searchParams;
  // The kanban "Add deal" column buttons pass ?stage= so the new deal starts
  // in the column it was created from.
  const initialStage = (DEAL_STAGES as readonly string[]).includes(stage ?? "")
    ? (stage as DealStage)
    : undefined;

  const [orgOptions, contactRows, members] = await Promise.all([
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.workspaceId, workspace.id))
      .orderBy(desc(organizations.updatedAt))
      .limit(200),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
      })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspace.id))
      .orderBy(desc(contacts.updatedAt))
      .limit(200),
    getWorkspaceMembers(workspace.id),
  ]);

  const contactOptions = contactRows.map((c) => ({
    id: c.id,
    name: contactName(c),
  }));

  return (
    <>
      <Topbar
        crumbs={[
          { icon: SquareKanban, label: "Deals" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <DealForm
            action={createDeal}
            defaultValues={{
              ...(initialStage ? { stage: initialStage } : {}),
              // Pre-select the org when arriving from its detail page.
              ...(organizationId && orgOptions.some((o) => o.id === organizationId)
                ? { organizationId }
                : {}),
            }}
            organizationOptions={orgOptions}
            contactOptions={contactOptions}
            memberOptions={members.map((m) => ({ id: m.id, name: m.name }))}
            currentUserId={user.id}
            cancelHref="/deals"
          />
        </div>
      </main>
    </>
  );
}
