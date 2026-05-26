import { ListChecks } from "lucide-react";

import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";

export default function TasksPage() {
  return (
    <>
      <Topbar crumbs={[{ icon: ListChecks, label: "Tasks" }]} />
      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div style={{ padding: 32 }}>
          <EmptyState
            icon={ListChecks}
            title="Tasks coming soon"
            description="Sectioned by Due today / Overdue / This week / Later / Done. Quick-add at top."
          />
        </div>
      </main>
    </>
  );
}
