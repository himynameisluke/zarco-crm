import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus, Sparkles, SquareKanban } from "lucide-react";

import { db } from "@/lib/db";
import { contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { KanbanBoard } from "@/components/deals/kanban-board";
import { formatMoney } from "@/lib/format";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  type DealStage,
} from "./schema";

function isDealStage(v: string | undefined): v is DealStage {
  return typeof v === "string" && (DEAL_STAGES as readonly string[]).includes(v);
}

/** Builds a /deals href preserving the other filter's state. */
function filterHref(stage: DealStage | null, owner: "me" | null) {
  const params = new URLSearchParams();
  if (stage) params.set("stage", stage);
  if (owner) params.set("owner", owner);
  const qs = params.toString();
  return qs ? `/deals?${qs}` : "/deals";
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; owner?: string }>;
}) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const sp = await searchParams;
  const stageFilter = isDealStage(sp.stage) ? sp.stage : null;
  const ownerFilter = sp.owner === "me" ? ("me" as const) : null;

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
      stageChangedAt: deals.stageChangedAt,
      ownerId: deals.ownerId,
      organizationName: organizations.name,
      primaryContactFirstName: contacts.firstName,
      primaryContactLastName: contacts.lastName,
    })
    .from(deals)
    .leftJoin(organizations, eq(deals.organizationId, organizations.id))
    .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
    .where(eq(deals.workspaceId, workspace.id))
    .orderBy(desc(deals.updatedAt))
    .limit(500);

  // Filters applied in JS — the whole board is already loaded (≤500 rows)
  // and this keeps column counts/sums consistent with what's shown.
  const filtered = rows.filter(
    (d) =>
      (!stageFilter || d.stage === stageFilter) &&
      (!ownerFilter || d.ownerId === user.id),
  );

  const openDeals = filtered.filter(
    (d) => d.stage !== "won" && d.stage !== "lost",
  );
  const totalPipeline = openDeals.reduce(
    (sum, d) => sum + (d.valuePence ?? 0),
    0,
  );

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    textDecoration: "none",
    border: `1px solid ${active ? "var(--magenta)" : "var(--hairline)"}`,
    color: active ? "var(--magenta)" : "var(--ink-3)",
    background: active ? "var(--paper-3)" : "transparent",
    whiteSpace: "nowrap" as const,
  });

  return (
    <>
      <Topbar
        crumbs={[{ icon: SquareKanban, label: "Deals" }]}
        actions={
          <Link href="/deals/new" className="btn btn-primary">
            <Plus size={13} />
            New deal
          </Link>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        {/* Summary + filter toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 16px",
            borderBottom: "1px solid var(--hairline)",
            fontSize: 11.5,
            color: "var(--ink-3)",
            flexWrap: "wrap",
          }}
        >
          <span>
            <span className="t-mono" style={{ color: "var(--ink-2)" }}>
              {filtered.length}
            </span>{" "}
            deal{filtered.length === 1 ? "" : "s"} · open pipeline{" "}
            <span className="t-num" style={{ color: "var(--ink)" }}>
              {formatMoney(totalPipeline)}
            </span>
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginLeft: 8,
            }}
          >
            <Link
              href={filterHref(stageFilter, null)}
              style={chipStyle(!ownerFilter)}
            >
              All deals
            </Link>
            <Link
              href={filterHref(stageFilter, "me")}
              style={chipStyle(ownerFilter === "me")}
            >
              My deals
            </Link>
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              overflowX: "auto",
            }}
          >
            <Link href={filterHref(null, ownerFilter)} style={chipStyle(!stageFilter)}>
              All stages
            </Link>
            {DEAL_STAGES.map((s) => (
              <Link
                key={s}
                href={filterHref(s, ownerFilter)}
                style={chipStyle(stageFilter === s)}
              >
                {DEAL_STAGE_LABELS[s]}
              </Link>
            ))}
          </span>

          <div style={{ flex: 1 }} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Sparkles size={11} color="var(--magenta)" />
            Claude is watching this board
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState
              icon={SquareKanban}
              title={
                rows.length === 0 ? "No deals yet" : "No deals match this filter"
              }
              description={
                rows.length === 0
                  ? "Create your first deal to start building your pipeline."
                  : "Try clearing the stage or owner filter."
              }
              action={
                rows.length === 0 ? (
                  <Link href="/deals/new" className="btn btn-primary">
                    <Plus size={13} />
                    New deal
                  </Link>
                ) : (
                  <Link href="/deals" className="btn">
                    Clear filters
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <KanbanBoard deals={filtered} visibleStages={stageFilter ? [stageFilter] : undefined} />
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
                background: "var(--paper-3)",
                color: "var(--ink-60)",
                border: "1px solid var(--ink-20)",
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
                background: "var(--warning-wash)",
                color: "var(--warning)",
                border: "1px solid var(--warning-edge)",
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
                background: "var(--danger-wash)",
                color: "var(--danger)",
                border: "1px solid var(--danger-edge)",
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
