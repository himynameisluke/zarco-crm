import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
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
    <div>
      <PageHeader title={`Edit ${org.name}`} />
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <OrganizationForm
          action={updateOrganization.bind(null, id)}
          defaultValues={org}
          submitLabel="Save changes"
          cancelHref={`/organizations/${id}`}
        />
      </div>
    </div>
  );
}
