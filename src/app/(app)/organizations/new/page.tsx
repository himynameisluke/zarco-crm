import { PageHeader } from "@/components/page-header";
import { OrganizationForm } from "@/components/organizations/organization-form";
import { createOrganization } from "../actions";

export default function NewOrganizationPage() {
  return (
    <div>
      <PageHeader title="New organization" description="Add a company to your CRM." />
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <OrganizationForm action={createOrganization} cancelHref="/organizations" />
      </div>
    </div>
  );
}
