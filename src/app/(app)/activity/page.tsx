import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import {
  Activity as ActivityIcon,
  Calendar,
  CheckSquare,
  ChevronRight,
  FileText,
  Mail,
  Phone,
  StickyNote,
  Zap,
} from "lucide-react";

import { db } from "@/lib/db";
import { activities, contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { formatRelative } from "@/lib/format";

const ACTIVITY_TYPES = [
  "email",
  "call",
  "meeting",
  "note",
  "status_change",
  "task_completed",
  "quote_sent",
  "quote_viewed",
  "quote_accepted",
] as const;

const ACTIVITY_SOURCES = [
  "manual",
  "granola",
  "email_sync",
  "system",
] as const;

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Mail; color: string; label: string }
> = {
  // Activity-type icons stay ink-60 — the icon shape carries the meaning, and
  // the system avoids color-coding by category. The one accent reserved is
  // for MCP-sourced activity, handled separately downstream.
  email: { icon: Mail, color: "var(--ink-60)", label: "Email" },
  call: { icon: Phone, color: "var(--ink-60)", label: "Call" },
  meeting: { icon: Calendar, color: "var(--ink-60)", label: "Meeting" },
  note: { icon: StickyNote, color: "var(--ink-60)", label: "Note" },
  status_change: { icon: ChevronRight, color: "var(--ink-60)", label: "Status" },
  task_completed: { icon: CheckSquare, color: "var(--success)", label: "Task done" },
  quote_sent: { icon: FileText, color: "var(--ink-60)", label: "Quote sent" },
  quote_viewed: { icon: FileText, color: "var(--ink-60)", label: "Quote viewed" },
  quote_accepted: { icon: FileText, color: "var(--success)", label: "Quote accepted" },
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  granola: "Granola",
  email_sync: "Email sync",
  system: "System",
  mcp: "Claude (MCP)",
};

function isValidType(value: string | null | undefined): value is (typeof ACTIVITY_TYPES)[number] {
  return value != null && (ACTIVITY_TYPES as readonly string[]).includes(value);
}

function isValidSource(value: string | null | undefined): value is (typeof ACTIVITY_SOURCES)[number] {
  return value != null && (ACTIVITY_SOURCES as readonly string[]).includes(value);
}

function subjectHref(type: string, id: string): string {
  switch (type) {
    case "contact":
      return `/contacts/${id}`;
    case "organization":
      return `/organizations/${id}`;
    case "deal":
      return `/deals/${id}`;
    case "project":
      return `/projects/${id}`;
    default:
      return "#";
  }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const raw = await searchParams;
  const typeFilter =
    typeof raw.type === "string" && isValidType(raw.type) ? raw.type : null;
  const sourceFilter =
    typeof raw.source === "string" && isValidSource(raw.source)
      ? raw.source
      : null;

  const conditions = [eq(activities.workspaceId, workspace.id)];
  if (typeFilter) conditions.push(eq(activities.type, typeFilter));
  if (sourceFilter) conditions.push(eq(activities.source, sourceFilter));

  const rows = await db
    .select({
      id: activities.id,
      type: activities.type,
      source: activities.source,
      subject: activities.subject,
      body: activities.body,
      subjectType: activities.subjectType,
      subjectId: activities.subjectId,
      occurredAt: activities.occurredAt,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      organizationName: organizations.name,
      dealName: deals.name,
    })
    .from(activities)
    .leftJoin(
      contacts,
      and(eq(activities.subjectType, "contact"), eq(activities.subjectId, contacts.id)),
    )
    .leftJoin(
      organizations,
      and(
        eq(activities.subjectType, "organization"),
        eq(activities.subjectId, organizations.id),
      ),
    )
    .leftJoin(
      deals,
      and(eq(activities.subjectType, "deal"), eq(activities.subjectId, deals.id)),
    )
    .where(and(...conditions))
    .orderBy(desc(activities.occurredAt))
    .limit(200);

  return (
    <>
      <Topbar crumbs={[{ icon: ActivityIcon, label: "Activity" }]} />
      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        {/* Filter toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid var(--hairline)",
            flexWrap: "wrap",
          }}
        >
          <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
            Type
          </span>
          <Link
            href={
              sourceFilter
                ? `/activity?source=${sourceFilter}`
                : "/activity"
            }
            className="chip"
            style={
              !typeFilter
                ? {
                    background: "var(--amber-soft)",
                    color: "var(--ink)",
                    borderColor: "var(--amber-soft)",
                  }
                : undefined
            }
          >
            All
          </Link>
          {ACTIVITY_TYPES.map((t) => {
            const active = typeFilter === t;
            const params = new URLSearchParams();
            params.set("type", t);
            if (sourceFilter) params.set("source", sourceFilter);
            return (
              <Link
                key={t}
                href={`/activity?${params.toString()}`}
                className="chip"
                style={
                  active
                    ? {
                        background: "var(--amber-soft)",
                        color: "var(--ink)",
                        borderColor: "var(--amber-soft)",
                      }
                    : undefined
                }
              >
                {TYPE_CONFIG[t]?.label ?? t}
              </Link>
            );
          })}
          <span
            style={{
              width: 1,
              height: 16,
              background: "var(--hairline)",
              margin: "0 4px",
            }}
          />
          <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
            Source
          </span>
          <Link
            href={typeFilter ? `/activity?type=${typeFilter}` : "/activity"}
            className="chip"
            style={
              !sourceFilter
                ? {
                    background: "var(--amber-soft)",
                    color: "var(--ink)",
                    borderColor: "var(--amber-soft)",
                  }
                : undefined
            }
          >
            All
          </Link>
          {ACTIVITY_SOURCES.map((s) => {
            const active = sourceFilter === s;
            const params = new URLSearchParams();
            if (typeFilter) params.set("type", typeFilter);
            params.set("source", s);
            return (
              <Link
                key={s}
                href={`/activity?${params.toString()}`}
                className="chip"
                style={
                  active
                    ? {
                        background: "var(--amber-soft)",
                        color: "var(--ink)",
                        borderColor: "var(--amber-soft)",
                      }
                    : undefined
                }
              >
                {SOURCE_LABELS[s] ?? s}
              </Link>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={ActivityIcon}
                title="No activity matches"
                description={
                  typeFilter || sourceFilter
                    ? "Try removing a filter."
                    : "Manual notes, Outlook sync, and Granola transcripts will appear here once you wire them up."
                }
              />
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: "8px 0",
              }}
            >
              {rows.map((a) => {
                const config = TYPE_CONFIG[a.type] ?? {
                  icon: ChevronRight,
                  color: "var(--ink-3)",
                  label: a.type,
                };
                const isMcp = (a.source as string) === "mcp";
                const Icon = isMcp ? Zap : config.icon;
                const iconColor = isMcp ? "var(--amber)" : config.color;
                const subjectLabel =
                  a.subjectType === "contact"
                    ? [a.contactFirstName, a.contactLastName].filter(Boolean).join(" ")
                    : a.subjectType === "organization"
                      ? a.organizationName
                      : a.subjectType === "deal"
                        ? a.dealName
                        : null;

                return (
                  <li
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--hairline)",
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: "var(--surface-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        color: iconColor,
                      }}
                    >
                      <Icon size={13} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12.5,
                            color: "var(--ink)",
                            fontWeight: 500,
                          }}
                        >
                          {a.subject ?? config.label}
                        </span>
                        {subjectLabel ? (
                          <Link
                            href={subjectHref(a.subjectType, a.subjectId)}
                            style={{
                              fontSize: 12,
                              color: "var(--ink-3)",
                              textDecoration: "underline",
                              textDecorationColor: "var(--hairline-2)",
                              textUnderlineOffset: 3,
                            }}
                          >
                            {subjectLabel}
                          </Link>
                        ) : null}
                        <span
                          className="t-mono"
                          style={{ fontSize: 10, color: "var(--ink-4)" }}
                        >
                          {config.label.toLowerCase()} · {a.subjectType}
                          {a.source !== "manual"
                            ? ` · ${SOURCE_LABELS[a.source] ?? a.source}`
                            : ""}
                        </span>
                      </div>
                      {a.body ? (
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--ink-3)",
                            margin: "4px 0 0",
                            lineHeight: 1.5,
                          }}
                          className="line-clamp-3"
                        >
                          {a.body}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="t-mono"
                      style={{
                        fontSize: 10.5,
                        color: "var(--ink-4)",
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    >
                      {formatRelative(a.occurredAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
