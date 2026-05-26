import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { DealForm } from "@/components/deals/deal-form";
import { createDeal } from "../actions";

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email || "Unnamed";
}

export default async function NewDealPage() {
  await requireUser();

  const [orgOptions, contactRows] = await Promise.all([
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
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
      .orderBy(desc(contacts.updatedAt))
      .limit(200),
  ]);

  const contactOptions = contactRows.map((c) => ({
    id: c.id,
    name: contactName(c),
  }));

  return (
    <div>
      <PageHeader title="New deal" description="Add a deal to your pipeline." />
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <DealForm
          action={createDeal}
          organizationOptions={orgOptions}
          contactOptions={contactOptions}
          cancelHref="/deals"
        />
      </div>
    </div>
  );
}
