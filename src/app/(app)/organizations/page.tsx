import { Building2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function OrganizationsPage() {
  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Companies you work with."
      />
      <div className="p-4 lg:p-8">
        <EmptyState
          icon={Building2}
          title="Organizations module coming soon"
          description="Will follow the same pattern as contacts."
        />
      </div>
    </div>
  );
}
