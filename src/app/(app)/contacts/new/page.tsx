import { desc, eq } from "drizzle-orm";
import { Users } from "lucide-react";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { ContactForm } from "@/components/contacts/contact-form";
import { createContact } from "../actions";

export default async function NewContactPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const orgOptions = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.workspaceId, workspace.id))
    .orderBy(desc(organizations.updatedAt))
    .limit(200);

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Users, label: "Contacts" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ContactForm
            action={createContact}
            organizationOptions={orgOptions}
            cancelHref="/contacts"
          />
        </div>
      </main>
    </>
  );
}
