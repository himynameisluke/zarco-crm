import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  Calendar,
  CircleDollarSign,
  Pencil,
  User as UserIcon,
  Building2,
  Activity as ActivityIcon,
  FileText,
  SquareKanban,
} from "lucide-react";

import { db } from "@/lib/db";
import {
  activities,
  contacts,
  deals,
  organizations,
  quotes,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Topbar } from "@/components/nav/topbar";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DealStageSelect } from "@/components/deals/deal-stage-select";
import { DeleteDealButton } from "@/components/deals/delete-deal-button";
import { ActivityComposer } from "@/components/activity/activity-composer";
import { DEAL_TYPE_LABELS, type DealType } from "../schema";

function formatMoney(pence: number | null, currency: string) {
  if (pence == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    pence / 100,
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function contactName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed";
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-foreground">{value}</div>
      </div>
    </div>
  );
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [deal] = await db
    .select({
      id: deals.id,
      name: deals.name,
      type: deals.type,
      stage: deals.stage,
      valuePence: deals.valuePence,
      currency: deals.currency,
      closeDate: deals.closeDate,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      organizationId: deals.organizationId,
      organizationName: organizations.name,
      primaryContactId: deals.primaryContactId,
    })
    .from(deals)
    .leftJoin(organizations, eq(deals.organizationId, organizations.id))
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)))
    .limit(1);

  if (!deal) {
    notFound();
  }

  const [primaryContact, dealActivities, dealQuotes] = await Promise.all([
    deal.primaryContactId
      ? db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.id, deal.primaryContactId),
              eq(contacts.workspaceId, workspace.id),
            ),
          )
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.workspaceId, workspace.id),
          eq(activities.subjectType, "deal"),
          eq(activities.subjectId, id),
        ),
      )
      .orderBy(desc(activities.occurredAt))
      .limit(20),
    db
      .select()
      .from(quotes)
      .where(
        and(eq(quotes.workspaceId, workspace.id), eq(quotes.dealId, id)),
      )
      .orderBy(desc(quotes.createdAt))
      .limit(20),
  ]);

  return (
    <>
      <Topbar
        crumbs={[
          { icon: SquareKanban, label: "Deals" },
          { label: deal.name },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/deals/${deal.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeleteDealButton dealId={deal.id} dealName={deal.name} />
          </>
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <PageHeader
          title={deal.name}
          description={DEAL_TYPE_LABELS[deal.type as DealType]}
        />

      <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow
              icon={CircleDollarSign}
              label="Stage"
              value={<DealStageSelect dealId={deal.id} currentStage={deal.stage} />}
            />
            <Separator />
            <DetailRow
              icon={CircleDollarSign}
              label="Value"
              value={formatMoney(deal.valuePence, deal.currency)}
            />
            <DetailRow
              icon={Calendar}
              label="Expected close"
              value={formatDate(deal.closeDate)}
            />
            <DetailRow
              icon={Building2}
              label="Organization"
              value={
                deal.organizationId && deal.organizationName ? (
                  <Link
                    href={`/organizations/${deal.organizationId}`}
                    className="hover:underline"
                  >
                    {deal.organizationName}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              icon={UserIcon}
              label="Primary contact"
              value={
                primaryContact ? (
                  <Link
                    href={`/contacts/${primaryContact.id}`}
                    className="hover:underline"
                  >
                    {contactName(primaryContact)}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <ActivityComposer subjectType="deal" subjectId={deal.id} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quotes ({dealQuotes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {dealQuotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No quotes yet. Quote builder comes in phase 4.
                </p>
              ) : (
                <ul className="space-y-2">
                  {dealQuotes.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {q.quoteNumber}
                        <Badge variant="secondary" className="text-xs">
                          {q.status}
                        </Badge>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatMoney(q.totalPence, q.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {dealActivities.length === 0 ? (
                <EmptyState
                  icon={ActivityIcon}
                  title="No activity yet"
                  description="Notes, calls, and meetings logged against this deal will appear here."
                />
              ) : (
                <ol className="space-y-4">
                  {dealActivities.map((event) => (
                    <li key={event.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">{event.subject ?? event.type}</p>
                      {event.body ? (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                          {event.body}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {event.type} · {event.occurredAt.toLocaleString("en-GB")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
    </>
  );
}
