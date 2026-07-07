import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { RefreshCw } from "lucide-react";

import { db } from "@/lib/db";
import { contracts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { ContractForm } from "@/components/renewals/contract-form";
import { DeleteContractButton } from "@/components/renewals/delete-contract-button";
import { updateContract } from "../../actions";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;

  const [contract, orgOptions, dealOptions] = await Promise.all([
    db
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.workspaceId, workspace.id)))
      .limit(1)
      .then((r) => r[0] ?? null),
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
  ]);

  if (!contract) {
    notFound();
  }

  return (
    <>
      <Topbar
        crumbs={[
          { icon: RefreshCw, label: "Renewals" },
          { label: contract.name, href: "/renewals" },
          { label: "Edit" },
        ]}
        actions={
          <DeleteContractButton
            contractId={contract.id}
            contractName={contract.name}
          />
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ContractForm
            action={updateContract.bind(null, id)}
            defaultValues={contract}
            organizationOptions={orgOptions}
            dealOptions={dealOptions}
            submitLabel="Save changes"
            cancelHref="/renewals"
          />
        </div>
      </main>
    </>
  );
}
