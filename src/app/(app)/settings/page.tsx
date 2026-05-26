import { Settings } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Your account, integrations, and workspace preferences." />
      <div className="p-4 lg:p-8">
        <EmptyState
          icon={Settings}
          title="Settings coming soon"
          description="Will include profile, integrations (Outlook, Resend, Granola), and team management."
        />
      </div>
    </div>
  );
}
