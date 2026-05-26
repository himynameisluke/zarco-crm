import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";

import { db } from "@/lib/db";
import {
  contacts,
  deals,
  organizations,
  quoteLineItems,
  quotes,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { QuoteForm } from "@/components/quotes/quote-form";
import { updateQuote } from "../../actions";

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email || "Unnamed";
}

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [quote, lineItems, orgOptions, dealOptions, contactRows] = await Promise.all([
    db.select().from(quotes).where(eq(quotes.id, id)).limit(1).then((r) => r[0]),
    db
      .select()
      .from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, id))
      .orderBy(asc(quoteLineItems.sortOrder)),
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .orderBy(desc(organizations.updatedAt))
      .limit(200),
    db
      .select({ id: deals.id, name: deals.name })
      .from(deals)
      .orderBy(desc(deals.updatedAt))
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

  if (!quote) {
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
          { icon: FileText, label: "Quotes" },
          { label: quote.quoteNumber, href: `/quotes/${id}` },
          { label: "Edit" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-4xl p-4 lg:p-8">
          <QuoteForm
            action={updateQuote.bind(null, id)}
            defaultValues={{
              dealId: quote.dealId,
              organizationId: quote.organizationId,
              contactId: quote.contactId,
              taxRate: quote.taxRate,
              validUntil: quote.validUntil,
              notes: quote.notes,
              currency: quote.currency,
              lineItems: lineItems.map((li) => ({
                description: li.description,
                quantity: li.quantity,
                unitPricePence: li.unitPricePence,
              })),
            }}
            organizationOptions={orgOptions}
            dealOptions={dealOptions}
            contactOptions={contactOptions}
            submitLabel="Save changes"
            cancelHref={`/quotes/${id}`}
          />
        </div>
      </main>
    </>
  );
}
