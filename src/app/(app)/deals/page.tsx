import { Briefcase } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function DealsPage() {
  return (
    <div>
      <PageHeader
        title="Deals"
        description="Pipeline across engagements, sales, projects, and retainers."
      />
      <div className="p-4 lg:p-8">
        <EmptyState
          icon={Briefcase}
          title="Kanban pipeline coming soon"
          description="Drag-drop board grouped by stage. Need design conversation first."
        />
      </div>
    </div>
  );
}
