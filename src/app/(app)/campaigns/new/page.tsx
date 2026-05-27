import { desc, eq, sql } from "drizzle-orm";
import { Megaphone } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { createCampaign } from "../actions";

const DEFAULT_FROM = "hello@zarco.uk";

export default async function NewCampaignPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  // Only show orgs that have at least one contact with an email — otherwise
  // there's nothing to send to.
  const orgRows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      contactCount: sql<number>`count(${contacts.id})::int`,
    })
    .from(organizations)
    .leftJoin(
      contacts,
      sql`${contacts.organizationId} = ${organizations.id} AND ${contacts.email} IS NOT NULL`,
    )
    .where(eq(organizations.workspaceId, workspace.id))
    .groupBy(organizations.id)
    .having(sql`count(${contacts.id}) > 0`)
    .orderBy(desc(organizations.updatedAt))
    .limit(200);

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Megaphone, label: "Campaigns" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <CampaignForm
            action={createCampaign}
            organizationOptions={orgRows}
            defaultFromEmail={DEFAULT_FROM}
            cancelHref="/campaigns"
          />
        </div>
      </main>
    </>
  );
}
