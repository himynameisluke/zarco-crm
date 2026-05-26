import { CheckSquare } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function TasksPage() {
  return (
    <div>
      <PageHeader title="Tasks" description="Things to do, attached to contacts, deals, or standalone." />
      <div className="p-4 lg:p-8">
        <EmptyState icon={CheckSquare} title="Tasks coming soon" />
      </div>
    </div>
  );
}
