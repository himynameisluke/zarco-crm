import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Users } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { ContactForm } from "@/components/contacts/contact-form";
import { updateContact } from "../../actions";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [[contact], orgOptions] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspace.id)))
      .limit(1),
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.workspaceId, workspace.id))
      .orderBy(desc(organizations.updatedAt))
      .limit(200),
  ]);

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
            organizationOptions={orgOptions}
            submitLabel="Save changes"
            cancelHref={`/contacts/${id}`}
          />
        </div>
      </main>
    </>
  );
}
