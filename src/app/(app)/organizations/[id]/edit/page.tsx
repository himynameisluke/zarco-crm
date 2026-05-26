import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Building2 } from "lucide-react";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { OrganizationForm } from "@/components/organizations/organization-form";
import { updateOrganization } from "../../actions";

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  if (!org) {
    notFound();
  }

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Building2, label: "Organizations" },
          { label: org.name, href: `/organizations/${id}` },
          { label: "Edit" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <OrganizationForm
            action={updateOrganization.bind(null, id)}
            defaultValues={org}
            submitLabel="Save changes"
            cancelHref={`/organizations/${id}`}
          />
        </div>
      </main>
    </>
  );
}
