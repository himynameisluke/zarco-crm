import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
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
    <div>
      <PageHeader title={`Edit ${fullName}`} />
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <ContactForm
          action={updateContact.bind(null, id)}
          defaultValues={contact}
          submitLabel="Save changes"
          cancelHref={`/contacts/${id}`}
        />
      </div>
    </div>
  );
}
