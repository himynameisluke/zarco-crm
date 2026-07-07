import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Megaphone, MoreHorizontal, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { emailCampaigns, emailSends } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { formatRelative } from "@/lib/format";
import {
  CAMPAIGN_STATUS_CHIP,
  CAMPAIGN_STATUS_LABELS,
  type CampaignStatus,
} from "./schema";

export default async function CampaignsPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const rows = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      subject: emailCampaigns.subject,
      status: emailCampaigns.status,
      fromEmail: emailCampaigns.fromEmail,
      sentAt: emailCampaigns.sentAt,
      updatedAt: emailCampaigns.updatedAt,
      recipientCount: sql<number>`count(${emailSends.id})::int`,
    })
    .from(emailCampaigns)
    .leftJoin(emailSends, eq(emailSends.campaignId, emailCampaigns.id))
    .where(eq(emailCampaigns.workspaceId, workspace.id))
    .groupBy(emailCampaigns.id)
    .orderBy(desc(emailCampaigns.updatedAt))
    .limit(200);

  const total = rows.length;

  return (
    <>
      <Topbar
        crumbs={[{ icon: Megaphone, label: "Campaigns" }]}
        actions={
          <Link href="/campaigns/new" className="btn btn-primary">
            <Plus size={13} />
            New campaign
          </Link>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Build your first outbound. Pick a target org, write the body, save as draft. Email delivery ships once you wire Resend."
                action={
                  <Link href="/campaigns/new" className="btn btn-primary">
                    <Plus size={13} />
                    New campaign
                  </Link>
                }
              />
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 280 }}>Name</th>
                  <th>Subject</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 100, textAlign: "right" }}>Recipients</th>
                  <th style={{ width: 110, textAlign: "right" }}>Updated</th>
                  <th style={{ width: 32 }} aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/campaigns/${c.id}`}
                        style={{
                          color: "var(--ink)",
                          fontWeight: 450,
                          textDecoration: "none",
                        }}
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td
                      className="truncate"
                      style={{ color: "var(--ink-3)", maxWidth: 360 }}
                    >
                      {c.subject}
                    </td>
                    <td>
                      <span
                        className={`chip ${CAMPAIGN_STATUS_CHIP[c.status as CampaignStatus]}`}
                      >
                        {CAMPAIGN_STATUS_LABELS[c.status as CampaignStatus]}
                      </span>
                    </td>
                    <td
                      className="t-mono"
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        color: "var(--ink-3)",
                      }}
                    >
                      {c.recipientCount > 0 ? c.recipientCount : "—"}
                    </td>
                    <td
                      className="t-mono"
                      style={{
                        textAlign: "right",
                        fontSize: 11.5,
                        color: "var(--ink-3)",
                      }}
                    >
                      {formatRelative(c.updatedAt)}
                    </td>
                    <td>
                      <RowActionsMenu
                        viewHref={`/campaigns/${c.id}`}
                        editHref={`/campaigns/${c.id}/edit`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "8px 16px",
              borderTop: "1px solid var(--hairline)",
              fontSize: 11.5,
              color: "var(--ink-3)",
            }}
          >
            <span>
              {total.toLocaleString("en-GB")} campaign
              {total === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </main>
    </>
  );
}
