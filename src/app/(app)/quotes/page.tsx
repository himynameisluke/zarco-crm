import { FileText } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function QuotesPage() {
  return (
    <div>
      <PageHeader title="Quotes" description="Proposals and SOWs sent to clients." />
      <div className="p-4 lg:p-8">
        <EmptyState icon={FileText} title="Quote builder coming in phase 4" />
      </div>
    </div>
  );
}
