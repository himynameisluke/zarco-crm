import { desc } from "drizzle-orm";
import { SquareKanban } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
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
    <>
      <Topbar
        crumbs={[
          { icon: SquareKanban, label: "Deals" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <DealForm
            action={createDeal}
            organizationOptions={orgOptions}
            contactOptions={contactOptions}
            cancelHref="/deals"
          />
        </div>
      </main>
    </>
  );
}
