import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Briefcase, Filter, Plus, Sparkles, SquareKanban } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { KanbanBoard } from "@/components/deals/kanban-board";
import { formatMoney } from "@/lib/format";

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
      updatedAt: deals.updatedAt,
      organizationName: organizations.name,
      primaryContactFirstName: contacts.firstName,
      primaryContactLastName: contacts.lastName,
    })
    .from(deals)
    .leftJoin(organizations, eq(deals.organizationId, organizations.id))
    .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
    .orderBy(desc(deals.updatedAt))
    .limit(500);

  const openDeals = rows.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const totalPipeline = openDeals.reduce(
    (sum, d) => sum + (d.valuePence ?? 0),
    0,
  );

  return (
    <>
      <Topbar
        crumbs={[{ icon: SquareKanban, label: "Deals" }]}
        tabs={[
          { id: "pipeline", label: "Pipeline", icon: SquareKanban, active: true },
          { id: "list", label: "List", icon: Briefcase },
        ]}
        actions={
          <>
            <button type="button" className="btn">
              <Filter size={13} />
              Filter
            </button>
            <Link href="/deals/new" className="btn btn-primary">
              <Plus size={13} />
              New deal
            </Link>
          </>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        {/* Summary toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 16px",
            borderBottom: "1px solid var(--hairline)",
            fontSize: 11.5,
            color: "var(--ink-3)",
          }}
        >
          <span>
            <span className="t-mono" style={{ color: "var(--ink-2)" }}>
              {rows.length}
            </span>{" "}
            deal{rows.length === 1 ? "" : "s"} · open pipeline{" "}
            <span className="t-num" style={{ color: "var(--ink)" }}>
              {formatMoney(totalPipeline)}
            </span>
          </span>
          <div style={{ flex: 1 }} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Sparkles size={11} color="var(--amber)" />
            Claude is watching this board
          </span>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState
              icon={SquareKanban}
              title="No deals yet"
              description="Create your first deal to start building your pipeline."
              action={
                <Link href="/deals/new" className="btn btn-primary">
                  <Plus size={13} />
                  New deal
                </Link>
              }
            />
          </div>
        ) : (
          <KanbanBoard deals={rows} />
        )}

        {/* Days-in-stage legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "8px 16px",
            borderTop: "1px solid var(--hairline)",
            fontSize: 11,
            color: "var(--ink-4)",
            flexShrink: 0,
          }}
        >
          <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
            Days-in-stage
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                fontFamily: "var(--code)",
                fontSize: 9.5,
                padding: "1px 5px",
                borderRadius: 3,
                background: "rgba(255,255,255,0.04)",
                color: "var(--ink-3)",
                border: "1px solid var(--hairline)",
              }}
            >
              0–6d
            </span>
            <span
              style={{
                fontFamily: "var(--code)",
                fontSize: 9.5,
                padding: "1px 5px",
                borderRadius: 3,
                background: "oklch(0.82 0.14 70 / 0.10)",
                color: "oklch(0.86 0.14 70)",
                border: "1px solid oklch(0.82 0.14 70 / 0.25)",
              }}
            >
              7–13d
            </span>
            <span
              style={{
                fontFamily: "var(--code)",
                fontSize: 9.5,
                padding: "1px 5px",
                borderRadius: 3,
                background: "oklch(0.70 0.20 25 / 0.10)",
                color: "oklch(0.80 0.20 25)",
                border: "1px solid oklch(0.70 0.20 25 / 0.25)",
              }}
            >
              14d+
            </span>
          </span>
        </div>
      </main>
    </>
  );
}
