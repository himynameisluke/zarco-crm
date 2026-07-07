import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Pencil, Plus, RefreshCw } from "lucide-react";

import { db } from "@/lib/db";
import { contracts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { CreateRenewalDealButton } from "@/components/renewals/create-renewal-deal-button";
import { daysSince, formatDateShort, formatMoney } from "@/lib/format";
import {
  CONTRACT_PERIOD_LABELS,
  CONTRACT_STATUS_CHIP,
  CONTRACT_STATUS_LABELS,
  PERIODS_PER_YEAR,
  type ContractBillingPeriod,
  type ContractStatus,
} from "./schema";

/** Days until a YYYY-MM-DD date (negative = past). */
function daysUntil(dateStr: string): number {
  return -(daysSince(dateStr) ?? 0);
}

function dueChip(days: number): React.CSSProperties {
  if (days < 0) {
    return {
      color: "var(--danger)",
      background: "var(--danger-wash)",
      border: "1px solid var(--danger-edge)",
    };
  }
  if (days <= 30) {
    return {
      color: "var(--danger)",
      background: "var(--danger-wash)",
      border: "1px solid var(--danger-edge)",
    };
  }
  if (days <= 90) {
    return {
      color: "var(--warning)",
      background: "var(--warning-wash)",
      border: "1px solid var(--warning-edge)",
    };
  }
  return {
    color: "var(--ink-60)",
    background: "var(--paper-3)",
    border: "1px solid var(--ink-20)",
  };
}

export default async function RenewalsPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const rows = await db
    .select({
      id: contracts.id,
      name: contracts.name,
      status: contracts.status,
      valuePence: contracts.valuePence,
      currency: contracts.currency,
      billingPeriod: contracts.billingPeriod,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      autoRenew: contracts.autoRenew,
      renewalDealId: contracts.renewalDealId,
      organizationId: contracts.organizationId,
      organizationName: organizations.name,
      renewalDealStage: deals.stage,
    })
    .from(contracts)
    .leftJoin(organizations, eq(contracts.organizationId, organizations.id))
    .leftJoin(deals, eq(contracts.renewalDealId, deals.id))
    .where(eq(contracts.workspaceId, workspace.id))
    .orderBy(asc(contracts.endDate))
    .limit(500);

  const active = rows.filter((c) => c.status === "active");
  const dueSoon = active.filter((c) => daysUntil(c.endDate) <= 90);
  const later = active.filter((c) => daysUntil(c.endDate) > 90);
  const past = rows.filter((c) => c.status !== "active");

  const annualisedActive = active.reduce(
    (sum, c) =>
      sum +
      (c.valuePence ?? 0) *
        PERIODS_PER_YEAR[c.billingPeriod as ContractBillingPeriod],
    0,
  );

  const Section = ({
    title,
    hint,
    items,
    showCreate,
  }: {
    title: string;
    hint?: string;
    items: typeof rows;
    showCreate?: boolean;
  }) =>
    items.length === 0 ? null : (
      <section style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <h2 className="t-display" style={{ fontSize: 15, margin: 0, color: "var(--ink)" }}>
            {title}
          </h2>
          <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
            {items.length}
          </span>
          {hint ? (
            <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{hint}</span>
          ) : null}
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Contract</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 130, textAlign: "right" }}>Value</th>
                <th style={{ width: 120, textAlign: "right" }}>Renews</th>
                <th style={{ width: 90, textAlign: "right" }}>Due in</th>
                <th style={{ width: 210, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const days = daysUntil(c.endDate);
                return (
                  <tr key={c.id}>
                    <td>
                      <span style={{ color: "var(--ink)", fontWeight: 450 }}>
                        {c.name}
                      </span>
                      {c.organizationName ? (
                        <>
                          <br />
                          <Link
                            href={`/organizations/${c.organizationId}`}
                            style={{ fontSize: 11.5, color: "var(--ink-3)" }}
                            className="hover:underline"
                          >
                            {c.organizationName}
                          </Link>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`chip ${CONTRACT_STATUS_CHIP[c.status as ContractStatus]}`}
                        style={{ height: 20, fontSize: 10.5 }}
                      >
                        {CONTRACT_STATUS_LABELS[c.status as ContractStatus]}
                      </span>
                      {c.autoRenew ? (
                        <span
                          className="t-mono"
                          style={{
                            marginLeft: 6,
                            fontSize: 9.5,
                            color: "var(--ink-4)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          AUTO
                        </span>
                      ) : null}
                    </td>
                    <td className="t-num" style={{ textAlign: "right" }}>
                      {c.valuePence != null ? (
                        <>
                          {formatMoney(c.valuePence, c.currency)}
                          <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                            {" "}
                            /{CONTRACT_PERIOD_LABELS[
                              c.billingPeriod as ContractBillingPeriod
                            ].toLowerCase()}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className="t-mono"
                      style={{ textAlign: "right", fontSize: 11.5, color: "var(--ink-3)" }}
                    >
                      {formatDateShort(c.endDate)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 3,
                          ...dueChip(days),
                        }}
                      >
                        {days < 0 ? `${-days}d ago` : `${days}d`}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        {showCreate &&
                        !c.autoRenew &&
                        (!c.renewalDealId || !c.renewalDealStage) ? (
                          <CreateRenewalDealButton contractId={c.id} />
                        ) : null}
                        {c.renewalDealId && c.renewalDealStage ? (
                          <Link
                            href={`/deals/${c.renewalDealId}`}
                            className="btn btn-sm"
                          >
                            Renewal deal · {c.renewalDealStage}
                          </Link>
                        ) : null}
                        <Link
                          href={`/renewals/${c.id}/edit`}
                          className="btn btn-ghost btn-sm"
                          aria-label="Edit contract"
                        >
                          <Pencil size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );

  return (
    <>
      <Topbar
        crumbs={[{ icon: RefreshCw, label: "Renewals" }]}
        actions={
          <Link href="/renewals/new" className="btn btn-primary">
            <Plus size={13} />
            New contract
          </Link>
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              marginBottom: 20,
              fontSize: 12,
              color: "var(--ink-3)",
            }}
          >
            <span>
              <span className="t-mono" style={{ color: "var(--ink-2)" }}>
                {active.length}
              </span>{" "}
              active contract{active.length === 1 ? "" : "s"} · annualised value{" "}
              <span className="t-num" style={{ color: "var(--ink)" }}>
                {formatMoney(annualisedActive)}
              </span>
            </span>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={RefreshCw}
                title="No contracts yet"
                description="When a retainer or recurring engagement is won, track it here so the renewal never sneaks up on you. Won deals offer a one-click 'Track as contract'."
                action={
                  <Link href="/renewals/new" className="btn btn-primary">
                    <Plus size={13} />
                    New contract
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <Section
                title="Renewing soon"
                hint="within 90 days — line up the renewal conversation"
                items={dueSoon}
                showCreate
              />
              <Section title="Active" items={later} showCreate />
              <Section title="Past" items={past} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
