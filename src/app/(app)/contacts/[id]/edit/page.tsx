import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Users } from "lucide-react";

import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { ContactForm } from "@/components/contacts/contact-form";
import { updateContact } from "../../actions";

export default async function EditContactPage({
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

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "contact";

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Users, label: "Contacts" },
          { label: fullName, href: `/contacts/${id}` },
          { label: "Edit" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ContactForm
            action={updateContact.bind(null, id)}
            defaultValues={contact}
            submitLabel="Save changes"
            cancelHref={`/contacts/${id}`}
          />
        </div>
      </main>
    </>
  );
}
