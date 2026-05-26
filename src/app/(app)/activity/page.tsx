import { Activity } from "lucide-react";

import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";

export default function ActivityPage() {
  return (
    <>
      <Topbar crumbs={[{ icon: Activity, label: "Activity" }]} />
      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div style={{ padding: 32 }}>
          <EmptyState
            icon={Activity}
            title="Global activity feed coming soon"
            description="Sources: manual notes, Outlook sync, Granola transcripts, MCP writes."
          />
        </div>
      </main>
    </>
  );
}
