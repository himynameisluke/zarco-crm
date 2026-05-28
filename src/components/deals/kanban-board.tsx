import Link from "next/link";
import { Calendar, Flame, MoreHorizontal, Plus } from "lucide-react";

import { colorFromString } from "@/lib/colors";
import { daysSince, formatDateShort, formatMoney, getInitials } from "@/lib/format";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  type DealStage,
} from "@/app/(app)/deals/schema";

type Deal = {
  id: string;
  name: string;
  stage: DealStage;
  type: string;
  valuePence: number | null;
  currency: string;
  closeDate: string | null;
  updatedAt: Date;
  organizationName: string | null;
  primaryContactFirstName: string | null;
  primaryContactLastName: string | null;
};

// Stage dots on kanban column headers. The dashboard's stacked "Pipeline by
// stage" bar uses the same scheme — this is a tracker, so deal heat needs
// to read at a glance. Progression is a temperature ramp inside the
// system's allowed status palette:
//   lead       — ink-40 (neutral, "just landed")
//   qualified  — info blue (cool, formal — "we have signal")
//   proposal   — warning amber (warm, "active, watching closely")
//   negotiation— magenta accent (hot, "act now")
//   won        — success green
//   lost       — danger red
// Mirrors STAGE_ACCENT in src/components/dashboard/dashboard.tsx — keep
// the two in sync when you change either.
const STAGE_ACCENT: Record<DealStage, string> = {
  lead: "var(--ink-40)",
  qualified: "var(--info)",
  proposal: "var(--warning)",
  negotiation: "var(--magenta)",
  won: "var(--success)",
  lost: "var(--danger)",
};

// Days-in-stage chip on each deal card. Quiet washes — the number does the
// work. ≥14d nudges danger-red, ≥7d uses warning amber. The wash vars
// flip cleanly with theme so chips read on both paper and ink surfaces.
function daysChipStyle(days: number) {
  if (days >= 14) {
    return {
      color: "var(--danger)",
      background: "var(--danger-wash)",
      border: "1px solid var(--danger-edge)",
    };
  }
  if (days >= 7) {
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

function DealCard({ deal }: { deal: Deal }) {
  const days = daysSince(deal.updatedAt) ?? 0;
  const chip = daysChipStyle(days);
  const contactInitials = getInitials(
    deal.primaryContactFirstName,
    deal.primaryContactLastName,
  );
  const contactColor = colorFromString(
    `${deal.primaryContactFirstName ?? ""}${deal.primaryContactLastName ?? ""}`,
  );
  const isHot = deal.stage === "negotiation" && days >= 7;
  const isWon = deal.stage === "won";
  const closeDisplay = isWon
    ? `Won · ${formatDateShort(deal.updatedAt)}`
    : deal.closeDate
      ? formatDateShort(deal.closeDate)
      : "—";
  const idSuffix = deal.id.slice(-4).toUpperCase();

  return (
    <Link
      href={`/deals/${deal.id}`}
      style={{
        background: "var(--panel)",
        border: "1px solid var(--hairline)",
        borderRadius: 8,
        padding: "11px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textDecoration: "none",
        color: "inherit",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-40)" }}>
          D-{idSuffix}
        </span>
        {isHot ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 10,
              color: "var(--magenta)",
              fontWeight: 600,
            }}
          >
            <Flame size={11} />
            hot
          </span>
        ) : null}
        <div style={{ flex: 1 }} />
        <MoreHorizontal size={12} color="var(--ink-40)" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontSize: 13,
            color: "var(--ink)",
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {deal.name}
        </div>
        {deal.organizationName ? (
          <div className="truncate" style={{ fontSize: 11.5, color: "var(--ink-60)" }}>
            {deal.organizationName}
          </div>
        ) : null}
      </div>

      {deal.valuePence != null ? (
        <div
          className="t-num"
          style={{ fontSize: 18, color: "var(--ink)", letterSpacing: "-0.02em" }}
        >
          {formatMoney(deal.valuePence, deal.currency)}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 6,
          borderTop: "1px solid var(--hairline)",
        }}
      >
        {contactInitials !== "·" ? (
          <span
            className="zk-avatar"
            style={{
              width: 18,
              height: 18,
              fontSize: 9,
              background: `${contactColor}22`,
              borderColor: `${contactColor}55`,
              color: contactColor,
            }}
          >
            {contactInitials}
          </span>
        ) : null}
        <span
          style={{
            fontSize: 11,
            color: "var(--ink-60)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Calendar size={10} color="var(--ink-40)" />
          {closeDisplay}
        </span>
        <div style={{ flex: 1 }} />
        <span
          className="t-mono"
          style={{
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 3,
            ...chip,
          }}
          title={`${days} days in stage`}
        >
          {days}d
        </span>
      </div>
    </Link>
  );
}

function StageColumn({
  stage,
  deals,
}: {
  stage: DealStage;
  deals: Deal[];
}) {
  const total = deals.reduce((sum, d) => sum + (d.valuePence ?? 0), 0);
  const currency = deals[0]?.currency ?? "GBP";
  return (
    <div
      style={{
        width: 268,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px 8px",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: STAGE_ACCENT[stage],
          }}
        />
        <span style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>
          {DEAL_STAGE_LABELS[stage]}
        </span>
        <span
          className="t-mono"
          style={{ fontSize: 10.5, color: "var(--ink-40)" }}
        >
          {deals.length}
        </span>
        <div style={{ flex: 1 }} />
        {total > 0 ? (
          <span
            className="t-num"
            style={{ fontSize: 13, color: "var(--ink-2)" }}
          >
            {formatMoney(total, currency)}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflowY: "auto",
          paddingRight: 2,
        }}
      >
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
        <Link
          href={`/deals/new?stage=${stage}`}
          className="btn btn-ghost btn-sm"
          style={{
            justifyContent: "flex-start",
            color: "var(--ink-40)",
            padding: "6px 8px",
            textDecoration: "none",
          }}
        >
          <Plus size={11} />
          Add deal
        </Link>
      </div>
    </div>
  );
}

export function KanbanBoard({ deals }: { deals: Deal[] }) {
  const grouped: Record<DealStage, Deal[]> = {
    lead: [],
    qualified: [],
    proposal: [],
    negotiation: [],
    won: [],
    lost: [],
  };
  for (const d of deals) {
    grouped[d.stage].push(d);
  }

  return (
    <div
      style={{
        flex: 1,
        overflowX: "auto",
        overflowY: "hidden",
        padding: "16px 16px 24px",
      }}
    >
      <div style={{ display: "flex", gap: 14, height: "100%" }}>
        {DEAL_STAGES.map((stage) => (
          <StageColumn key={stage} stage={stage} deals={grouped[stage]} />
        ))}
      </div>
    </div>
  );
}
