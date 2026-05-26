import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Briefcase, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { KanbanBoard } from "@/components/deals/kanban-board";

export default async function DealsPage() {
  await requireUser();

  const rows = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      type: deals.type,
      valuePence: deals.valuePence,
      currency: deals.currency,
      closeDate: deals.closeDate,
      organizationName: organizations.name,
    })
    .from(deals)
    .leftJoin(organizations, eq(deals.organizationId, organizations.id))
    .orderBy(desc(deals.updatedAt))
    .limit(500);

  return (
    <div>
      <PageHeader
        title="Deals"
        description="Pipeline across engagements, sales, projects, and retainers."
        action={
          <Button asChild>
            <Link href="/deals/new">
              <Plus className="h-4 w-4" />
              New deal
            </Link>
          </Button>
        }
      />

      <div className="p-4 lg:p-8">
        {rows.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No deals yet"
            description="Create your first deal to start building your pipeline."
            action={
              <Button asChild>
                <Link href="/deals/new">
                  <Plus className="h-4 w-4" />
                  New deal
                </Link>
              </Button>
            }
          />
        ) : (
          <KanbanBoard deals={rows} />
        )}
      </div>
    </div>
  );
}
