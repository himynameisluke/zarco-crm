import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  SortAsc,
} from "lucide-react";

import { db } from "@/lib/db";
import { activities, contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { colorFromString } from "@/lib/colors";
import { formatMoney, formatRelative } from "@/lib/format";

export default async function OrganizationsPage() {
  await requireUser();

  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      domain: organizations.domain,
      industry: organizations.industry,
      employeeCount: organizations.employeeCount,
      updatedAt: organizations.updatedAt,
      contactCount: sql<number>`count(distinct ${contacts.id})::int`,
      dealCount: sql<number>`count(distinct ${deals.id})::int`,
      pipelineValue: sql<number | null>`sum(${deals.valuePence})::bigint`,
      lastActivityAt: sql<Date | null>`max(${activities.occurredAt})`,
    })
    .from(organizations)
    .leftJoin(contacts, eq(contacts.organizationId, organizations.id))
    .leftJoin(deals, eq(deals.organizationId, organizations.id))
    .leftJoin(
      activities,
      sql`${activities.subjectType} = 'organization' AND ${activities.subjectId} = ${organizations.id}`,
    )
    .groupBy(organizations.id)
    .orderBy(desc(organizations.updatedAt))
    .limit(200);

  const total = rows.length;

  return (
    <>
      <Topbar
        crumbs={[{ icon: Building2, label: "Organizations" }]}
        actions={
          <>
            <button type="button" className="btn">
              <Download size={13} />
              Export
            </button>
            <Link href="/organizations/new" className="btn btn-primary">
              <Plus size={13} />
              New organization
            </Link>
          </>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid var(--hairline)",
          }}
        >
          <div className="input" style={{ width: 280 }}>
            <Search size={13} color="var(--ink-4)" />
            <input
              placeholder={`Search ${total.toLocaleString("en-GB")} organization${total === 1 ? "" : "s"}…`}
            />
          </div>
          <button type="button" className="btn">
            <Filter size={13} />
            Filter
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost btn-sm">
            <SortAsc size={12} />
            Last activity
          </button>
          <button type="button" className="btn btn-ghost btn-sm">
            <Layers size={12} />
            Columns
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={Building2}
                title="No organizations yet"
                description="Add your first organization to start tracking companies."
                action={
                  <Link href="/organizations/new" className="btn btn-primary">
                    <Plus size={13} />
                    New organization
                  </Link>
                }
              />
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 260 }}>Name</th>
                  <th style={{ width: 200 }}>Domain</th>
                  <th style={{ width: 160 }}>Industry</th>
                  <th style={{ width: 100, textAlign: "right" }}>Employees</th>
                  <th style={{ width: 100, textAlign: "right" }}>Contacts</th>
                  <th style={{ width: 120, textAlign: "right" }}>Pipeline</th>
                  <th style={{ width: 110, textAlign: "right" }}>Last activity</th>
                  <th style={{ width: 32 }} aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const orgColor = colorFromString(o.name);
                  const initial = o.name.charAt(0).toUpperCase();
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link
                          href={`/organizations/${o.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            color: "inherit",
                            textDecoration: "none",
                          }}
                        >
                          <span
                            className="zk-avatar"
                            style={{
                              background: `${orgColor}22`,
                              borderColor: `${orgColor}55`,
                              color: orgColor,
                              borderRadius: 4,
                            }}
                          >
                            {initial}
                          </span>
                          <span style={{ color: "var(--ink)", fontWeight: 450 }}>
                            {o.name}
                          </span>
                        </Link>
                      </td>
                      <td
                        className="t-mono"
                        style={{ fontSize: 12, color: "var(--ink-3)" }}
                      >
                        {o.domain ?? "—"}
                      </td>
                      <td>{o.industry ?? <span style={{ color: "var(--ink-4)" }}>—</span>}</td>
                      <td
                        style={{ textAlign: "right", color: "var(--ink-3)" }}
                        className="t-mono"
                      >
                        {o.employeeCount ?? "—"}
                      </td>
                      <td
                        style={{ textAlign: "right", color: "var(--ink-3)" }}
                        className="t-mono"
                      >
                        {o.contactCount > 0 ? o.contactCount : "—"}
                      </td>
                      <td
                        style={{ textAlign: "right" }}
                        className="t-num"
                      >
                        {o.pipelineValue ? formatMoney(Number(o.pipelineValue)) : (
                          <span style={{ color: "var(--ink-4)" }}>—</span>
                        )}
                      </td>
                      <td
                        className="t-mono"
                        style={{
                          textAlign: "right",
                          fontSize: 11.5,
                          color: "var(--ink-3)",
                        }}
                      >
                        {o.lastActivityAt
                          ? formatRelative(o.lastActivityAt)
                          : formatRelative(o.updatedAt)}
                      </td>
                      <td>
                        <button
                          type="button"
                          style={{
                            padding: 4,
                            borderRadius: 4,
                            background: "transparent",
                            border: 0,
                            color: "var(--ink-4)",
                            cursor: "pointer",
                          }}
                          aria-label="Row actions"
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "8px 16px",
              borderTop: "1px solid var(--hairline)",
              fontSize: 11.5,
              color: "var(--ink-3)",
            }}
          >
            <span>
              Showing 1–{total} of {total.toLocaleString("en-GB")}
            </span>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost btn-sm" disabled>
              <ChevronLeft size={11} />
            </button>
            <span className="t-mono" style={{ fontSize: 10.5 }}>
              PAGE 1 / 1
            </span>
            <button type="button" className="btn btn-ghost btn-sm" disabled>
              <ChevronRight size={11} />
            </button>
          </div>
        ) : null}
      </main>
    </>
  );
}
