import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc, and } from "drizzle-orm";
import {
  Mail,
  Phone,
  Briefcase,
  Building2,
  Link as LinkIcon,
  Pencil,
  Activity as ActivityIcon,
  SquareKanban,
  User as UserIcon,
  Users,
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
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Topbar } from "@/components/nav/topbar";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DeleteContactButton } from "@/components/contacts/delete-contact-button";
import { ActivityComposer } from "@/components/activity/activity-composer";

function fullName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed contact";
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} className="text-foreground hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [contact] = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      linkedinUrl: contacts.linkedinUrl,
      notes: contacts.notes,
      organizationId: contacts.organizationId,
      organizationName: organizations.name,
      ownerEmail: authUsers.email,
    })
    .from(contacts)
    .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
    .leftJoin(authUsers, eq(contacts.ownerId, authUsers.id))
    .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspace.id)))
    .limit(1);

  if (!contact) {
    notFound();
  }

  const [timeline, contactDeals] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.workspaceId, workspace.id),
          eq(activities.subjectType, "contact"),
          eq(activities.subjectId, id),
        ),
      )
      .orderBy(desc(activities.occurredAt))
      .limit(50),
    // Deals where this person is the primary contact — the detail page never
    // showed them, so the relationship was invisible from this side.
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        valuePence: deals.valuePence,
        currency: deals.currency,
      })
      .from(deals)
      .where(
        and(
          eq(deals.workspaceId, workspace.id),
          eq(deals.primaryContactId, id),
        ),
      )
      .orderBy(desc(deals.updatedAt))
      .limit(20),
  ]);

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Users, label: "Contacts" },
          { label: fullName(contact) },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contacts/${contact.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeleteContactButton contactId={contact.id} contactName={fullName(contact)} />
          </>
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <PageHeader
          title={fullName(contact)}
          description={contact.title ?? undefined}
        />

      <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow
              icon={Mail}
              label="Email"
              value={contact.email}
              href={contact.email ? `mailto:${contact.email}` : undefined}
            />
            <DetailRow
              icon={Phone}
              label="Phone"
              value={contact.phone}
              href={contact.phone ? `tel:${contact.phone}` : undefined}
            />
            <DetailRow icon={Briefcase} label="Title" value={contact.title} />
            <DetailRow
              icon={LinkIcon}
              label="LinkedIn"
              value={contact.linkedinUrl}
              href={contact.linkedinUrl ?? undefined}
            />
            {contact.organizationId && contact.organizationName ? (
              <div className="flex items-start gap-3 text-sm">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <Link
                    href={`/organizations/${contact.organizationId}`}
                    className="text-foreground hover:underline"
                  >
                    {contact.organizationName}
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-3 text-sm">
              <UserIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1 space-y-0.5">
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-foreground">
                  {displayNameFromEmail(contact.ownerEmail)}
                </p>
              </div>
            </div>

            {contact.notes ? (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap text-sm">{contact.notes}</p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <ActivityComposer subjectType="contact" subjectId={contact.id} />
          {contactDeals.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Deals ({contactDeals.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {contactDeals.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/deals/${d.id}`}
                        className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/50"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <SquareKanban className="h-3.5 w-3.5 text-muted-foreground" />
                          {d.name}
                          <Badge variant="secondary" className="text-xs">
                            {d.stage}
                          </Badge>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {d.valuePence != null
                            ? formatMoney(d.valuePence, d.currency)
                            : "—"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <EmptyState
                icon={ActivityIcon}
                title="No activity yet"
                description="Emails, calls, meetings and notes will appear here once we wire up the ingest pipeline."
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
