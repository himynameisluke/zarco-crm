import { Activity } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function ActivityPage() {
  return (
    <div>
      <PageHeader
        title="Activity"
        description="Unified timeline of emails, calls, meetings, and notes across the CRM."
      />
      <div className="p-4 lg:p-8">
        <EmptyState
          icon={Activity}
          title="Global activity feed coming soon"
          description="Sources: manual notes, Outlook sync, Granola transcripts."
        />
      </div>
    </div>
  );
}
