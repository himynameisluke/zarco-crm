import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { Megaphone, Pencil } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, emailCampaigns, emailSends } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Topbar } from "@/components/nav/topbar";
import { PageHeader } from "@/components/page-header";
import { DeleteCampaignButton } from "@/components/campaigns/delete-campaign-button";
import { SendCampaignButton } from "@/components/campaigns/send-campaign-button";
import { formatDateShort, formatRelative } from "@/lib/format";
import {
  CAMPAIGN_STATUS_CHIP,
  CAMPAIGN_STATUS_LABELS,
  type CampaignStatus,
} from "../schema";

function contactName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed";
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  if (!campaign) {
    notFound();
  }

  const sends = await db
    .select({
      id: emailSends.id,
      toEmail: emailSends.toEmail,
      status: emailSends.status,
      sentAt: emailSends.sentAt,
      contactId: emailSends.contactId,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
    })
    .from(emailSends)
    .leftJoin(contacts, eq(emailSends.contactId, contacts.id))
    .where(eq(emailSends.campaignId, id))
    .orderBy(desc(emailSends.sentAt))
    .limit(500);

  const counts = await db
    .select({
      status: emailSends.status,
      count: sql<number>`count(*)::int`,
    })
    .from(emailSends)
    .where(eq(emailSends.campaignId, id))
    .groupBy(emailSends.status);

  const statsByStatus: Record<string, number> = {};
  for (const row of counts) statsByStatus[row.status] = row.count;
  const totalRecipients = sends.length;
  const sentCount = statsByStatus["sent"] ?? 0;
  const queuedCount = statsByStatus["queued"] ?? 0;

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Megaphone, label: "Campaigns" },
          { label: campaign.name },
        ]}
        actions={
          <>
            {campaign.status === "draft" ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/campaigns/${campaign.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            ) : null}
            {campaign.status === "draft" ? (
              <SendCampaignButton
                campaignId={campaign.id}
                recipientCount={queuedCount}
              />
            ) : null}
            <DeleteCampaignButton
              campaignId={campaign.id}
              campaignName={campaign.name}
            />
          </>
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <PageHeader
          title={campaign.name}
          description={campaign.subject}
          action={
            <span
              className={`chip ${CAMPAIGN_STATUS_CHIP[campaign.status as CampaignStatus]}`}
            >
              {CAMPAIGN_STATUS_LABELS[campaign.status as CampaignStatus]}
            </span>
          }
        />

        <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-8">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Sending stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Recipients</p>
                  <p className="text-foreground t-num" style={{ fontSize: 18 }}>
                    {totalRecipients}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-foreground t-num" style={{ fontSize: 18 }}>
                    {sentCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Queued</p>
                  <p className="text-foreground t-num" style={{ fontSize: 18 }}>
                    {queuedCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p className="text-foreground t-num" style={{ fontSize: 18 }}>
                    {statsByStatus["opened"] ?? 0}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <p className="text-muted-foreground">From</p>
                <p className="text-foreground">
                  {campaign.fromName ? `${campaign.fromName} · ` : ""}
                  {campaign.fromEmail}
                </p>
              </div>
              {campaign.sentAt ? (
                <div className="space-y-1 text-xs">
                  <p className="text-muted-foreground">Sent at</p>
                  <p className="text-foreground">
                    {formatDateShort(campaign.sentAt)}
                  </p>
                </div>
              ) : null}

              <p
                style={{
                  fontSize: 11,
                  color: "var(--ink-4)",
                  borderTop: "1px solid var(--hairline)",
                  paddingTop: 10,
                  marginTop: 4,
                  lineHeight: 1.5,
                }}
              >
                Resend isn&apos;t wired yet. Send transitions state without
                actually delivering email; opens/clicks/bounces will start
                populating once webhooks are connected.
              </p>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Body</CardTitle>
              </CardHeader>
              <CardContent>
                <pre
                  className="t-mono"
                  style={{
                    fontSize: 12,
                    color: "var(--ink-2)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {campaign.bodyHtml}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recipients ({totalRecipients})</CardTitle>
              </CardHeader>
              <CardContent>
                {sends.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: "var(--ink-4)" }}>
                    No recipients picked. Edit the campaign and choose an
                    organization to populate.
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {sends.map((s) => (
                      <li
                        key={s.id}
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid var(--hairline)",
                          display: "flex",
                          alignItems: "baseline",
                          gap: 10,
                          fontSize: 12.5,
                        }}
                      >
                        <span style={{ color: "var(--ink)", minWidth: 180 }}>
                          {s.contactFirstName || s.contactLastName
                            ? contactName({
                                firstName: s.contactFirstName,
                                lastName: s.contactLastName,
                              })
                            : "Unknown contact"}
                        </span>
                        <span
                          className="t-mono"
                          style={{ color: "var(--ink-3)", flex: 1 }}
                        >
                          {s.toEmail}
                        </span>
                        <span
                          className="chip"
                          style={{
                            height: 18,
                            fontSize: 10.5,
                            padding: "0 6px",
                            background:
                              s.status === "sent"
                                ? "oklch(0.78 0.18 145 / 0.10)"
                                : "rgba(255,255,255,0.05)",
                            color:
                              s.status === "sent"
                                ? "oklch(0.85 0.18 145)"
                                : "var(--ink-3)",
                          }}
                        >
                          {s.status}
                        </span>
                        <span
                          className="t-mono"
                          style={{
                            fontSize: 10.5,
                            color: "var(--ink-4)",
                            minWidth: 60,
                            textAlign: "right",
                          }}
                        >
                          {s.sentAt ? formatRelative(s.sentAt) : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
