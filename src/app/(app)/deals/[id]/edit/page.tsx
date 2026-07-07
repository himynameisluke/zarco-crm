import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { SquareKanban } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { getWorkspaceMembers } from "@/lib/workspace/members";
import { Topbar } from "@/components/nav/topbar";
import { DealForm } from "@/components/deals/deal-form";
import { updateDeal } from "../../actions";

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email || "Unnamed";
}

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [deal, orgOptions, contactRows, members] = await Promise.all([
    db
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)))
      .limit(1)
      .then((r) => r[0]),
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

  if (!deal) {
    notFound();
  }

  const contactOptions = contactRows.map((c) => ({
    id: c.id,
    name: contactName(c),
  }));

  return (
    <>
      <Topbar
        crumbs={[
          { icon: SquareKanban, label: "Deals" },
          { label: deal.name, href: `/deals/${id}` },
          { label: "Edit" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <DealForm
            action={updateDeal.bind(null, id)}
            defaultValues={deal}
            organizationOptions={orgOptions}
            contactOptions={contactOptions}
            memberOptions={members.map((m) => ({ id: m.id, name: m.name }))}
            currentUserId={user.id}
            submitLabel="Save changes"
            cancelHref={`/deals/${id}`}
          />
        </div>
      </main>
    </>
  );
}
