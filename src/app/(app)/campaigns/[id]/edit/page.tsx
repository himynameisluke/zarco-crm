import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { Megaphone } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, emailCampaigns, emailSends, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { updateCampaign } from "../../actions";

const DEFAULT_FROM = "hello@zarco.uk";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [campaign, orgRows, currentSendOrg] = await Promise.all([
    db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, id),
          eq(emailCampaigns.workspaceId, workspace.id),
        ),
      )
      .limit(1)
      .then((r) => r[0]),
    db
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
      .limit(200),
    // Recover the previously-selected target org by looking at the existing
    // queued recipient's contact → organizationId. Best-effort — if the
    // campaign hasn't queued anyone yet this returns null and the form
    // defaults to no selection.
    db
      .select({ organizationId: contacts.organizationId })
      .from(emailSends)
      .innerJoin(contacts, eq(emailSends.contactId, contacts.id))
      .where(
        and(
          eq(emailSends.workspaceId, workspace.id),
          eq(emailSends.campaignId, id),
        ),
      )
      .limit(1)
      .then((r) => r[0]?.organizationId ?? null),
  ]);

  if (!campaign) {
    notFound();
  }

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Megaphone, label: "Campaigns" },
          { label: campaign.name, href: `/campaigns/${id}` },
          { label: "Edit" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <CampaignForm
            action={updateCampaign.bind(null, id)}
            defaultValues={{
              name: campaign.name,
              subject: campaign.subject,
              bodyHtml: campaign.bodyHtml,
              fromEmail: campaign.fromEmail,
              fromName: campaign.fromName,
              targetOrganizationId: currentSendOrg,
            }}
            organizationOptions={orgRows}
            defaultFromEmail={DEFAULT_FROM}
            submitLabel="Save changes"
            cancelHref={`/campaigns/${id}`}
          />
        </div>
      </main>
    </>
  );
}
