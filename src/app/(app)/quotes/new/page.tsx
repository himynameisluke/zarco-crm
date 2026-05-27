import { desc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { QuoteForm } from "@/components/quotes/quote-form";
import { createQuote } from "../actions";

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email || "Unnamed";
}

export default async function NewQuotePage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const [orgOptions, dealOptions, contactRows] = await Promise.all([
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.workspaceId, workspace.id))
      .orderBy(desc(organizations.updatedAt))
      .limit(200),
    db
      .select({ id: deals.id, name: deals.name })
      .from(deals)
      .where(eq(deals.workspaceId, workspace.id))
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
      .where(eq(contacts.workspaceId, workspace.id))
      .orderBy(desc(contacts.updatedAt))
      .limit(200),
  ]);

  const contactOptions = contactRows.map((c) => ({
    id: c.id,
    name: contactName(c),
  }));

  return (
    <>
      <Topbar
        crumbs={[
          { icon: FileText, label: "Quotes" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-4xl p-4 lg:p-8">
          <QuoteForm
            action={createQuote}
            organizationOptions={orgOptions}
            dealOptions={dealOptions}
            contactOptions={contactOptions}
            cancelHref="/quotes"
          />
        </div>
      </main>
    </>
  );
}
