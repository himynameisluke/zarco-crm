import Link from "next/link";
import {
  and,
  desc,
  eq,
  gt,
  gte,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import {
  ArrowUpLeft,
  ArrowDownRight,
  ChevronRight,
  Filter,
  Home,
  Mail,
  Phone,
  Calendar,
  FileText,
  StickyNote,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";

import { db } from "@/lib/db";
import {
  activities,
  deals,
  oauthAccessTokens,
  tasks,
} from "@/lib/db/schema";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { formatMoney, formatRelative } from "@/lib/format";
import {
  DEAL_STAGE_LABELS,
  type DealStage,
} from "@/app/(app)/deals/schema";

// Weighting probabilities for the weighted-pipeline forecast.
// Aligned to the design's stage-bar treatment.
const STAGE_WEIGHTS: Record<DealStage, number> = {
  lead: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
  won: 1,
  lost: 0,
};

// Pipeline progress dots on the dashboard mini-bar. Mirrors the kanban
// color logic: neutral cool early, magenta on the "act now" stage, success
// and danger for terminal states.
const STAGE_ACCENT: Record<DealStage, string> = {
  lead: "var(--ink-40)",
  qualified: "var(--info)",
  proposal: "var(--ink-60)",
  negotiation: "var(--magenta)",
  won: "var(--success)",
  lost: "var(--danger)",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const part = local.split(/[._-]/)[0] ?? local;
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function KPI({
  label,
  value,
  sub,
  trend,
  big = true,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  big?: boolean;
}) {
  const isPositive = trend?.startsWith("+");
  return (
    <div
      className="card"
      style={{
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 96,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="t-label" style={{ fontSize: 11 }}>
          {label}
        </span>
        {trend ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontFamily: "var(--code)",
              fontSize: 10.5,
              color: isPositive ? "var(--success)" : "var(--danger)",
            }}
          >
            {isPositive ? (
              <ArrowUpLeft size={11} />
            ) : (
              <ArrowDownRight size={11} />
            )}
            {trend}
          </span>
        ) : null}
      </div>
      <div
        className="t-num"
        style={{
          fontSize: big ? 32 : 26,
          color: "var(--ink)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub ? (
        <span
          style={{
            fontSize: 11.5,
            color: "var(--ink-4)",
            fontFamily: "var(--code)",
          }}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function StageBar({
  stageTotals,
  pipelineValue,
  openCount,
}: {
  stageTotals: Record<DealStage, { value: number; count: number }>;
  pipelineValue: number;
  openCount: number;
}) {
  const openStages = (["lead", "qualified", "proposal", "negotiation"] as const).map(
    (id) => ({
      id,
      label: DEAL_STAGE_LABELS[id],
      value: stageTotals[id].value,
      count: stageTotals[id].count,
      color: STAGE_ACCENT[id],
    }),
  );

  return (
    <div className="card" style={{ padding: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span className="t-label" style={{ fontSize: 12, color: "var(--ink-2)" }}>
          Pipeline by stage
        </span>
        <span
          className="t-mono"
          style={{ fontSize: 10.5, color: "var(--ink-3)" }}
        >
          OPEN DEALS
        </span>
      </div>
      <div
        className="t-num"
        style={{
          fontSize: 32,
          lineHeight: 1.1,
          marginTop: 6,
          color: "var(--ink)",
        }}
      >
        {formatMoney(pipelineValue)}
        <span
          style={{
            fontSize: 13,
            color: "var(--ink-3)",
            fontFamily: "var(--code)",
            marginLeft: 6,
          }}
        >
          · {openCount} deal{openCount === 1 ? "" : "s"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 3,
          marginTop: 18,
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          background: "var(--surface-2)",
        }}
      >
        {openStages.map((s) => (
          <div
            key={s.id}
            style={{
              flex: Math.max(s.value, 1),
              background: s.color,
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginTop: 14,
        }}
      >
        {openStages.map((s) => (
          <Link
            key={s.id}
            href={`/deals?stage=${s.id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--hairline)",
              background: "var(--surface-1)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                {s.label}
              </span>
            </div>
            <div className="t-num" style={{ fontSize: 15, color: "var(--ink)" }}>
              {s.value > 0 ? formatMoney(s.value) : "—"}
            </div>
            <span
              className="t-mono"
              style={{ fontSize: 10, color: "var(--ink-4)" }}
            >
              {s.count} deal{s.count === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Activity icons in the dashboard timeline. The system avoids color-coding
// by activity type — the icon glyph carries the meaning. The exception is
// outcome activities (task done, quote accepted) where success-green earns
// its presence, and MCP-sourced activity which gets the magenta accent.
const ACTIVITY_CONFIG: Record<
  string,
  { icon: typeof Mail; color: string }
> = {
  email: { icon: Mail, color: "var(--ink-60)" },
  call: { icon: Phone, color: "var(--ink-60)" },
  meeting: { icon: Calendar, color: "var(--ink-60)" },
  note: { icon: StickyNote, color: "var(--ink-60)" },
  status_change: { icon: ChevronRight, color: "var(--ink-60)" },
  quote_sent: { icon: FileText, color: "var(--ink-60)" },
  quote_viewed: { icon: FileText, color: "var(--ink-60)" },
  quote_accepted: { icon: FileText, color: "var(--success)" },
  task_completed: { icon: ChevronRight, color: "var(--success)" },
};

function ActivityItem({
  activity,
}: {
  activity: {
    id: string;
    type: string;
    source: string;
    subjectType: string;
    subjectId: string;
    subject: string | null;
    body: string | null;
    occurredAt: Date;
  };
}) {
  const config = ACTIVITY_CONFIG[activity.type] ?? {
    icon: ChevronRight,
    color: "var(--ink-60)",
  };
  const Icon = activity.source === "mcp" ? Zap : config.icon;
  const color = activity.source === "mcp" ? "var(--magenta)" : config.color;
  return (
    <li
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 4px",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: "var(--surface-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
      >
        <Icon size={12} />
      </span>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>
            {activity.subject ?? activity.type}
          </span>
        </div>
        {activity.body ? (
          <p
            className="truncate"
            style={{ fontSize: 12, color: "var(--ink-3)", margin: 0 }}
          >
            {activity.body}
          </p>
        ) : null}
      </div>
      <span
        className="t-mono"
        style={{
          fontSize: 10.5,
          color: "var(--ink-4)",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {formatRelative(activity.occurredAt)}
      </span>
    </li>
  );
}

export async function Dashboard({ userEmail }: { userEmail: string }) {
  const workspace = await requireCurrentWorkspace();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Pipeline by stage (count + value, all stages)
  const stageBreakdown = await db
    .select({
      stage: deals.stage,
      count: sql<number>`count(*)::int`,
      value: sql<number>`coalesce(sum(${deals.valuePence}), 0)::bigint`,
    })
    .from(deals)
    .where(eq(deals.workspaceId, workspace.id))
    .groupBy(deals.stage);

  const stageTotals: Record<DealStage, { value: number; count: number }> = {
    lead: { value: 0, count: 0 },
    qualified: { value: 0, count: 0 },
    proposal: { value: 0, count: 0 },
    negotiation: { value: 0, count: 0 },
    won: { value: 0, count: 0 },
    lost: { value: 0, count: 0 },
  };
  for (const row of stageBreakdown) {
    stageTotals[row.stage] = {
      value: Number(row.value),
      count: row.count,
    };
  }

  const openStageIds: DealStage[] = ["lead", "qualified", "proposal", "negotiation"];
  const pipelineValue = openStageIds.reduce(
    (sum, s) => sum + stageTotals[s].value,
    0,
  );
  const openDealCount = openStageIds.reduce(
    (sum, s) => sum + stageTotals[s].count,
    0,
  );
  const weightedForecast = openStageIds.reduce(
    (sum, s) => sum + stageTotals[s].value * STAGE_WEIGHTS[s],
    0,
  );

  // Closed this month (won deals updated in the current calendar month)
  const closedThisMonth = await db
    .select({
      total: sql<number>`coalesce(sum(${deals.valuePence}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.workspaceId, workspace.id),
        eq(deals.stage, "won"),
        gte(deals.updatedAt, startOfMonth),
      ),
    );

  const closedAmount = Number(closedThisMonth[0]?.total ?? 0);
  const closedCount = closedThisMonth[0]?.count ?? 0;

  // Win rate (last 90 days)
  const winRateRows = await db
    .select({
      stage: deals.stage,
      count: sql<number>`count(*)::int`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.workspaceId, workspace.id),
        gte(deals.updatedAt, ninetyDaysAgo),
        or(eq(deals.stage, "won"), eq(deals.stage, "lost"))!,
      ),
    )
    .groupBy(deals.stage);
  const wonCount = winRateRows.find((r) => r.stage === "won")?.count ?? 0;
  const lostCount = winRateRows.find((r) => r.stage === "lost")?.count ?? 0;
  const totalDecided = wonCount + lostCount;
  const winRate =
    totalDecided === 0 ? null : Math.round((wonCount / totalDecided) * 100);

  // Recent activity (latest 6)
  const recentActivities = await db
    .select({
      id: activities.id,
      type: activities.type,
      source: activities.source,
      subjectType: activities.subjectType,
      subjectId: activities.subjectId,
      subject: activities.subject,
      body: activities.body,
      occurredAt: activities.occurredAt,
    })
    .from(activities)
    .where(eq(activities.workspaceId, workspace.id))
    .orderBy(desc(activities.occurredAt))
    .limit(6);

  // Tasks: due today (not done) and overdue (not done)
  const dueToday = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueAt: tasks.dueAt,
      subjectType: tasks.subjectType,
      subjectId: tasks.subjectId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspace.id),
        ne(tasks.status, "done"),
        isNotNull(tasks.dueAt),
        gte(tasks.dueAt, now),
        lt(tasks.dueAt, startOfTomorrow),
      ),
    )
    .orderBy(tasks.dueAt)
    .limit(8);

  const overdue = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueAt: tasks.dueAt,
      subjectType: tasks.subjectType,
      subjectId: tasks.subjectId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspace.id),
        ne(tasks.status, "done"),
        isNotNull(tasks.dueAt),
        lt(tasks.dueAt, now),
      ),
    )
    .orderBy(desc(tasks.dueAt))
    .limit(5);

  // MCP connection status — live (not expired, not revoked) bearer tokens.
  // Each connected Claude client = one row here.
  const [mcpClientCountRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(oauthAccessTokens)
    .where(
      and(
        isNull(oauthAccessTokens.revokedAt),
        gt(oauthAccessTokens.expiresAt, now),
      ),
    );
  const mcpClientCount = mcpClientCountRow?.n ?? 0;

  // MCP-attributed writes in the last 7 days (audit-trail activities).
  const [mcpActivityCountRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(activities)
    .where(
      and(
        eq(activities.workspaceId, workspace.id),
        eq(activities.source, "mcp"),
        gte(
          activities.occurredAt,
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        ),
      ),
    );
  const mcpRecentActivityCount = mcpActivityCountRow?.n ?? 0;

  const user = firstName(userEmail);
  const todayLabel = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <Topbar
        crumbs={[{ icon: Home, label: "Home" }]}
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

      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div style={{ padding: "20px 24px 32px" }}>
          {/* Greeting */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 18,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h1
                className="t-display"
                style={{ fontSize: 26, margin: 0, color: "var(--ink)" }}
              >
                {greeting()}, {user}.
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-3)",
                  margin: "4px 0 0",
                }}
              >
                {openDealCount} open deal{openDealCount === 1 ? "" : "s"} in
                pipeline · {recentActivities.length} recent activit
                {recentActivities.length === 1 ? "y" : "ies"} ·{" "}
                <span style={{ color: "var(--magenta)", fontWeight: 600 }}>
                  {overdue.length > 0
                    ? `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue.`
                    : "you're all caught up."}
                </span>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {mcpClientCount > 0 ? (
                <Link
                  href="/settings/mcp"
                  className="chip"
                  style={{
                    background: "var(--magenta-wash)",
                    border: "1px solid transparent",
                    color: "var(--magenta-ink)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600,
                  }}
                  title={`${mcpClientCount} Claude client${mcpClientCount === 1 ? "" : "s"} connected — ${mcpRecentActivityCount} write${mcpRecentActivityCount === 1 ? "" : "s"} this week. Click to manage.`}
                >
                  <Zap size={11} color="var(--magenta)" />
                  Claude · {mcpRecentActivityCount} write
                  {mcpRecentActivityCount === 1 ? "" : "s"}
                </Link>
              ) : null}
              <span className="chip --mute">{todayLabel}</span>
            </div>
          </div>

          {/* KPI row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <KPI
              label="Pipeline value"
              value={formatMoney(pipelineValue)}
              sub={`${openDealCount} open deal${openDealCount === 1 ? "" : "s"}`}
            />
            <KPI
              label="Weighted forecast"
              value={formatMoney(weightedForecast)}
              sub="Stage-weighted"
            />
            <KPI
              label="Win rate · 90d"
              value={winRate == null ? "—" : `${winRate}%`}
              sub={
                totalDecided === 0
                  ? "No closed deals yet"
                  : `${wonCount} won · ${lostCount} lost`
              }
            />
            <KPI
              label="Closed this month"
              value={formatMoney(closedAmount)}
              sub={`${closedCount} deal${closedCount === 1 ? "" : "s"} won`}
            />
          </div>

          {/* Pipeline-by-stage */}
          <div style={{ marginBottom: 16 }}>
            <StageBar
              stageTotals={stageTotals}
              pipelineValue={pipelineValue}
              openCount={openDealCount}
            />
          </div>

          {/* Bottom row: activity, tasks, (Claude card only when not yet
              connected — once you've got a client wired, the status pill in
              the greeting row carries the info and we widen activity + tasks). */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                mcpClientCount > 0 ? "1.6fr 1fr" : "1.4fr 1fr 1fr",
              gap: 16,
            }}
          >
            {/* Activity */}
            <div
              className="card"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px 10px",
                }}
              >
                <span
                  className="t-label"
                  style={{ fontSize: 12, color: "var(--ink-2)" }}
                >
                  Recent activity
                </span>
                <Link
                  href="/activity"
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  All <ChevronRight size={11} />
                </Link>
              </header>
              <ul
                style={{
                  padding: "0 18px 8px",
                  flex: 1,
                  listStyle: "none",
                  margin: 0,
                }}
              >
                {recentActivities.length === 0 ? (
                  <li
                    style={{
                      padding: "16px 4px",
                      color: "var(--ink-4)",
                      fontSize: 12.5,
                    }}
                  >
                    No activity yet. Manual notes, Outlook sync, and Granola
                    transcripts will appear here.
                  </li>
                ) : (
                  recentActivities.map((a) => (
                    <ActivityItem key={a.id} activity={a} />
                  ))
                )}
              </ul>
            </div>

            {/* Tasks */}
            <div
              className="card"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px 10px",
                }}
              >
                <span
                  className="t-label"
                  style={{ fontSize: 12, color: "var(--ink-2)" }}
                >
                  Today{" "}
                  <span style={{ color: "var(--ink-4)", marginLeft: 4 }}>
                    · {dueToday.length}
                  </span>
                </span>
                <Link
                  href="/tasks"
                  className="btn btn-ghost btn-sm"
                  style={{ textDecoration: "none" }}
                >
                  <Plus size={12} />
                  Add
                </Link>
              </header>
              <ul
                style={{
                  padding: "0 14px 12px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  listStyle: "none",
                  margin: 0,
                }}
              >
                {dueToday.length === 0 && overdue.length === 0 ? (
                  <li
                    style={{
                      padding: "16px 4px",
                      color: "var(--ink-4)",
                      fontSize: 12.5,
                    }}
                  >
                    Nothing on your plate. Quiet day.
                  </li>
                ) : null}

                {dueToday.map((t) => (
                  <li
                    key={t.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "8px 4px",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        marginTop: 2,
                        border: "1.5px solid var(--ink-4)",
                        borderRadius: 3.5,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--ink-2)",
                          lineHeight: 1.4,
                        }}
                      >
                        {t.title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 3,
                        }}
                      >
                        <span
                          className="t-mono"
                          style={{ fontSize: 10, color: "var(--ink-4)" }}
                        >
                          today ·{" "}
                          {t.dueAt
                            ? new Date(t.dueAt).toLocaleTimeString("en-GB", {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}

                {overdue.length > 0 ? (
                  <>
                    <li style={{ marginTop: 8, padding: "0 4px" }}>
                      <span
                        className="t-eyebrow"
                        style={{ fontSize: 9.5, color: "var(--danger)" }}
                      >
                        Overdue · {overdue.length}
                      </span>
                    </li>
                    {overdue.map((t) => (
                      <li
                        key={t.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          padding: "8px 4px",
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            marginTop: 2,
                            border: "1.5px solid rgba(199, 38, 60, 0.5)",
                            borderRadius: 3.5,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12.5,
                              color: "var(--ink-2)",
                            }}
                          >
                            {t.title}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 3,
                            }}
                          >
                            <span
                              className="t-mono"
                              style={{
                                fontSize: 10,
                                color: "var(--danger)",
                              }}
                            >
                              overdue · {formatRelative(t.dueAt)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </>
                ) : null}
              </ul>
            </div>

            {/* Claude / MCP card — only when nothing's connected (CTA state).
                Once any client connects, the small pill in the greeting row
                carries the status and this slot disappears. */}
            {mcpClientCount === 0 ? (
            <div
              className="card"
              style={{
                // System forbids gradients on cards; the magenta wash carries
                // the "this is the Claude/MCP CTA" cue on its own.
                background: "var(--magenta-wash)",
                borderColor: "transparent",
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px 10px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Zap size={13} color="var(--magenta)" />
                  <span
                    className="t-label"
                    style={{ fontSize: 12, color: "var(--ink)" }}
                  >
                    From Claude
                  </span>
                </div>
                <span
                  className="t-mono"
                  style={{ fontSize: 10, color: "var(--ink-4)" }}
                >
                  VIA MCP
                </span>
              </header>
              <div
                style={{
                  padding: "0 18px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Inner branching removed — outer mcpClientCount === 0
                    gate means this body only renders for the not-connected
                    case. Connected state is handled by the small pill in
                    the greeting row. */}
                <>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-2)",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      <span style={{ color: "var(--ink)" }}>
                        No Claude clients connected yet.
                      </span>{" "}
                      Hook up Claude.ai web, Claude Desktop, or Claude Code via
                      the MCP endpoint to drive the whole CRM from a
                      conversation — read contacts, create deals, log
                      activities, send quotes (with confirm).
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href="/settings/mcp"
                        className="btn btn-primary btn-sm"
                      >
                        Set up MCP
                      </Link>
                      <Link href="/activity" className="btn btn-sm">
                        Show activity
                      </Link>
                    </div>
                    <hr
                      style={{
                        margin: "4px 0",
                        border: 0,
                        borderTop: "1px solid var(--hairline)",
                      }}
                    />
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--ink-3)",
                        lineHeight: 1.5,
                        margin: 0,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                      }}
                    >
                      <Sparkles
                        size={11}
                        color="var(--magenta)"
                        style={{ marginTop: 3, flexShrink: 0 }}
                      />
                      Tools available: find/get/search across the CRM, create +
                      update entities, send emails + quotes (gated by explicit
                      confirm).
                    </p>
                </>
              </div>
            </div>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
