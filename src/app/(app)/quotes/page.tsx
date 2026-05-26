import { FileText } from "lucide-react";

import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";

export default function QuotesPage() {
  return (
    <>
      <Topbar crumbs={[{ icon: FileText, label: "Quotes" }]} />
      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div style={{ padding: 32 }}>
          <EmptyState
            icon={FileText}
            title="Quote builder coming in phase 4"
            description="Editable line items, live total, public client view via magic link."
          />
        </div>
      </main>
    </>
  );
}
