import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  Briefcase,
  Building2,
  Globe,
  Pencil,
  Users as UsersIcon,
  Activity as ActivityIcon,
} from "lucide-react";

import { db } from "@/lib/db";
import {
  activities,
  authUsers,
  contacts,
  deals,
  organizations,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { displayNameFromEmail } from "@/lib/workspace/members";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/nav/topbar";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DeleteOrganizationButton } from "@/components/organizations/delete-organization-button";
import { ActivityComposer } from "@/components/activity/activity-composer";

function contactName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed";
}

function formatMoney(pence: number | null, currency: string) {
  if (pence == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    pence / 100,
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Globe;
  label: string;
  value: string | number | null;
  href?: string;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      domain: organizations.domain,
      website: organizations.website,
      industry: organizations.industry,
      employeeCount: organizations.employeeCount,
      notes: organizations.notes,
      ownerEmail: authUsers.email,
    })
    .from(organizations)
    .leftJoin(authUsers, eq(organizations.ownerId, authUsers.id))
    .where(
      and(
        eq(organizations.id, id),
        eq(organizations.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  if (!org) {
    notFound();
  }

  const [orgContacts, orgDeals, timeline] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspace.id),
          eq(contacts.organizationId, id),
        ),
      )
      .orderBy(desc(contacts.updatedAt))
      .limit(50),
    db
      .select()
      .from(deals)
      .where(
        and(
          eq(deals.workspaceId, workspace.id),
          eq(deals.organizationId, id),
        ),
      )
      .orderBy(desc(deals.updatedAt))
      .limit(50),
    db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.workspaceId, workspace.id),
          eq(activities.subjectType, "organization"),
          eq(activities.subjectId, id),
        ),
      )
      .orderBy(desc(activities.occurredAt))
      .limit(20),
  ]);

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Building2, label: "Organizations" },
          { label: org.name },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/organizations/${org.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeleteOrganizationButton organizationId={org.id} organizationName={org.name} />
          </>
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <PageHeader
          title={org.name}
          description={org.industry ?? undefined}
        />

      <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow icon={Globe} label="Domain" value={org.domain} />
            <DetailRow
              icon={Globe}
              label="Website"
              value={org.website}
              href={org.website ?? undefined}
            />
            <DetailRow icon={Building2} label="Industry" value={org.industry} />
            <DetailRow icon={UsersIcon} label="Employees" value={org.employeeCount} />
            <DetailRow
              icon={Briefcase}
              label="Owner"
              value={displayNameFromEmail(org.ownerEmail)}
            />

            {org.notes ? (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap text-sm">{org.notes}</p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <ActivityComposer subjectType="organization" subjectId={org.id} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts ({orgContacts.length})</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/contacts/new?organizationId=${org.id}`}>Add contact</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {orgContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {orgContacts.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/contacts/${c.id}`}
                        className="flex items-baseline justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <span className="text-sm font-medium">{contactName(c)}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.title ?? c.email ?? ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Deals ({orgDeals.length})</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/deals/new?organizationId=${org.id}`}>Add deal</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {orgDeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deals linked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {orgDeals.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/deals/${d.id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          {d.name}
                          <Badge variant="secondary" className="text-xs">
                            {d.stage}
                          </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatMoney(d.valuePence, d.currency)}
                        </span>
                      </Link>
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
              {timeline.length === 0 ? (
                <EmptyState
                  icon={ActivityIcon}
                  title="No activity yet"
                  description="Notes, calls, and meetings logged against this organization will appear here."
                />
              ) : (
                <ol className="space-y-4">
                  {timeline.map((event) => (
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
