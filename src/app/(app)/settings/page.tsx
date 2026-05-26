import { Settings } from "lucide-react";

import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";

export default function SettingsPage() {
  return (
    <>
      <Topbar crumbs={[{ icon: Settings, label: "Settings" }]} />
      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div style={{ padding: 32 }}>
          <EmptyState
            icon={Settings}
            title="Settings coming soon"
            description="Profile, integrations (Outlook, Resend, Granola), team, API & MCP."
          />
        </div>
      </main>
    </>
  );
}
