import { and, desc, eq } from "drizzle-orm";
import { RefreshCw } from "lucide-react";

import { db } from "@/lib/db";
import { deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { ContractForm } from "@/components/renewals/contract-form";
import { createContract } from "../actions";

/**
 * New contract. When arriving from a won deal ("Track as contract"), ?dealId=
 * pre-fills the name, organization, source deal, per-period value (the deal's
 * value), and a start-today / renew-in-a-year window.
 */
export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { dealId } = await searchParams;

  const [orgOptions, dealOptions, sourceDeal] = await Promise.all([
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.workspaceId, workspace.id))
      .orderBy(desc(organizations.updatedAt))
      .limit(200),
    db
      .select({ id: deals.id, name: deals.name })
      .from(deals)
      .where(eq(deals.workspaceId, workspace.id))
      .orderBy(desc(deals.updatedAt))
      .limit(200),
    dealId
      ? db
          .select({
            id: deals.id,
            name: deals.name,
            valuePence: deals.valuePence,
            organizationId: deals.organizationId,
          })
          .from(deals)
          .where(and(eq(deals.id, dealId), eq(deals.workspaceId, workspace.id)))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const inAYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const defaults = sourceDeal
    ? {
        name: `Contract — ${sourceDeal.name}`,
        dealId: sourceDeal.id,
        organizationId: sourceDeal.organizationId,
        valuePence: sourceDeal.valuePence,
        startDate: today,
        endDate: inAYear,
      }
    : { startDate: today, endDate: inAYear };

  return (
    <>
      <Topbar
        crumbs={[
          { icon: RefreshCw, label: "Renewals" },
          { label: "New contract" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ContractForm
            action={createContract}
            defaultValues={defaults}
            organizationOptions={orgOptions}
            dealOptions={dealOptions}
            cancelHref="/renewals"
          />
        </div>
      </main>
    </>
  );
}
