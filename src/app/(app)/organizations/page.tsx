import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
} from "lucide-react";

import { db } from "@/lib/db";
import { activities, contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { colorFromString } from "@/lib/colors";
import { formatMoney, formatRelative } from "@/lib/format";

const PAGE_SIZE = 50;

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 200);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const searchCondition: SQL | undefined = q
    ? or(
        ilike(organizations.name, `%${q}%`),
        ilike(organizations.domain, `%${q}%`),
        ilike(organizations.industry, `%${q}%`),
      )
    : undefined;

  const whereClause = searchCondition
    ? and(eq(organizations.workspaceId, workspace.id), searchCondition)
    : eq(organizations.workspaceId, workspace.id);

  const [rows, [{ total }]] = await Promise.all([
    db
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
      .where(whereClause)
      .groupBy(organizations.id)
      .orderBy(desc(organizations.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(organizations)
      .where(whereClause),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/organizations?${qs}` : "/organizations";
  };

  return (
    <>
      <Topbar
        crumbs={[{ icon: Building2, label: "Organizations" }]}
        actions={
          <>
            <a href="/organizations/export" className="btn">
              <Download size={13} />
              Export
            </a>
            <Link href="/organizations/new" className="btn btn-primary">
              <Plus size={13} />
              New organization
            </Link>
          </>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        {/* Toolbar — GET form so search is linkable and stateless */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid var(--hairline)",
          }}
        >
          <form method="get" action="/organizations">
            <div className="input" style={{ width: 280 }}>
              <Search size={13} color="var(--ink-4)" />
              <input
                name="q"
                defaultValue={q}
                placeholder={`Search ${total.toLocaleString("en-GB")} organization${total === 1 ? "" : "s"}…`}
              />
            </div>
          </form>
          {q ? (
            <Link href="/organizations" className="btn btn-ghost btn-sm">
              Clear “{q}”
            </Link>
          ) : null}
          <div style={{ flex: 1 }} />
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={Building2}
                title={q ? `No organizations match “${q}”` : "No organizations yet"}
                description={
                  q
                    ? "Try a different name, domain, or industry."
                    : "Add your first organization to start tracking companies."
                }
                action={
                  q ? (
                    <Link href="/organizations" className="btn">
                      Clear search
                    </Link>
                  ) : (
                    <Link href="/organizations/new" className="btn btn-primary">
                      <Plus size={13} />
                      New organization
                    </Link>
                  )
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
                        <RowActionsMenu
                          viewHref={`/organizations/${o.id}`}
                          editHref={`/organizations/${o.id}/edit`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {total > 0 ? (
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
              Showing {from}–{to} of {total.toLocaleString("en-GB")}
            </span>
            <div style={{ flex: 1 }} />
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="btn btn-ghost btn-sm"
                aria-label="Previous page"
              >
                <ChevronLeft size={11} />
              </Link>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" disabled>
                <ChevronLeft size={11} />
              </button>
            )}
            <span className="t-mono" style={{ fontSize: 10.5 }}>
              PAGE {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="btn btn-ghost btn-sm"
                aria-label="Next page"
              >
                <ChevronRight size={11} />
              </Link>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" disabled>
                <ChevronRight size={11} />
              </button>
            )}
          </div>
        ) : null}
      </main>
    </>
  );
}
