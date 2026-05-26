import { Building2 } from "lucide-react";

import { Topbar } from "@/components/nav/topbar";
import { OrganizationForm } from "@/components/organizations/organization-form";
import { createOrganization } from "../actions";

export default function NewOrganizationPage() {
  return (
    <>
      <Topbar
        crumbs={[
          { icon: Building2, label: "Organizations" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <OrganizationForm action={createOrganization} cancelHref="/organizations" />
        </div>
      </main>
    </>
  );
}
