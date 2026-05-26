import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc, and } from "drizzle-orm";
import {
  Mail,
  Phone,
  Briefcase,
  Link as LinkIcon,
  Pencil,
  ArrowLeft,
  Activity as ActivityIcon,
} from "lucide-react";

import { db } from "@/lib/db";
import { contacts, activities } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DeleteContactButton } from "@/components/contacts/delete-contact-button";

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
  const { id } = await params;

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);

  if (!contact) {
    notFound();
  }

  const timeline = await db
    .select()
    .from(activities)
    .where(and(eq(activities.subjectType, "contact"), eq(activities.subjectId, id)))
    .orderBy(desc(activities.occurredAt))
    .limit(50);

  return (
    <div>
      <PageHeader
        title={fullName(contact)}
        description={contact.title ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contacts">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contacts/${contact.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeleteContactButton contactId={contact.id} contactName={fullName(contact)} />
          </div>
        }
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

        <Card className="lg:col-span-2">
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
  );
}
