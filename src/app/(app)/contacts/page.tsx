import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { db } from "@/lib/db";
import { activities, contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { colorFromString } from "@/lib/colors";
import { formatRelative, getInitials } from "@/lib/format";

const PAGE_SIZE = 50;

function fullName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed";
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 200);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Server-side search across name (incl. "first last"), email, and org name.
  const searchCondition: SQL | undefined = q
    ? or(
        sql`(coalesce(${contacts.firstName}, '') || ' ' || coalesce(${contacts.lastName}, '')) ilike ${`%${q}%`}`,
        ilike(contacts.email, `%${q}%`),
        ilike(organizations.name, `%${q}%`),
      )
    : undefined;

  const whereClause = searchCondition
    ? and(eq(contacts.workspaceId, workspace.id), searchCondition)
    : eq(contacts.workspaceId, workspace.id);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        title: contacts.title,
        updatedAt: contacts.updatedAt,
        organizationId: contacts.organizationId,
        organizationName: organizations.name,
        dealCount: sql<number>`count(distinct ${deals.id})::int`,
        lastActivityAt: sql<Date | null>`max(${activities.occurredAt})`,
      })
      .from(contacts)
      .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
      .leftJoin(deals, eq(deals.primaryContactId, contacts.id))
      .leftJoin(
        activities,
        sql`${activities.subjectType} = 'contact' AND ${activities.subjectId} = ${contacts.id}`,
      )
      .where(whereClause)
      .groupBy(contacts.id, organizations.name)
      .orderBy(desc(contacts.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: sql<number>`count(distinct ${contacts.id})::int` })
      .from(contacts)
      .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
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
    return qs ? `/contacts?${qs}` : "/contacts";
  };

  return (
    <>
      <Topbar
        crumbs={[{ icon: Users, label: "Contacts" }]}
        actions={
          <>
            <a href="/contacts/export" className="btn">
              <Download size={13} />
              Export
            </a>
            <Link href="/contacts/new" className="btn btn-primary">
              <Plus size={13} />
              New contact
            </Link>
          </>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        {/* Toolbar — a plain GET form so search is linkable and stateless */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid var(--hairline)",
          }}
        >
          <form method="get" action="/contacts">
            <div className="input" style={{ width: 280 }}>
              <Search size={13} color="var(--ink-4)" />
              <input
                name="q"
                defaultValue={q}
                placeholder={`Search ${total.toLocaleString("en-GB")} contact${total === 1 ? "" : "s"}…`}
              />
            </div>
          </form>
          {q ? (
            <Link href="/contacts" className="btn btn-ghost btn-sm">
              Clear “{q}”
            </Link>
          ) : null}
          <div style={{ flex: 1 }} />
        </div>

        {/* Table or empty state */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={Users}
                title={q ? `No contacts match “${q}”` : "No contacts yet"}
                description={
                  q
                    ? "Try a different name, email, or organization."
                    : "Add your first contact to start building your CRM."
                }
                action={
                  q ? (
                    <Link href="/contacts" className="btn">
                      Clear search
                    </Link>
                  ) : (
                    <Link href="/contacts/new" className="btn btn-primary">
                      <Plus size={13} />
                      New contact
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 240 }}>Name</th>
                  <th style={{ width: 170 }}>Title</th>
                  <th style={{ width: 200 }}>Organization</th>
                  <th style={{ width: 260 }}>Email</th>
                  <th style={{ width: 130 }}>Phone</th>
                  <th style={{ width: 100 }}>Deals</th>
                  <th style={{ width: 110, textAlign: "right" }}>Last activity</th>
                  <th style={{ width: 32 }} aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const orgColor = colorFromString(c.organizationName ?? c.organizationId);
                  const initials = getInitials(c.firstName, c.lastName);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/contacts/${c.id}`}
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
                            }}
                          >
                            {initials}
                          </span>
                          <span style={{ color: "var(--ink)", fontWeight: 450 }}>
                            {fullName(c)}
                          </span>
                        </Link>
                      </td>
                      <td>{c.title ?? <span style={{ color: "var(--ink-4)" }}>—</span>}</td>
                      <td>
                        {c.organizationName ? (
                          <Link
                            href={`/organizations/${c.organizationId}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              color: "inherit",
                              textDecoration: "none",
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 999,
                                background: orgColor,
                              }}
                            />
                            <span style={{ color: "var(--ink-2)" }}>
                              {c.organizationName}
                            </span>
                          </Link>
                        ) : (
                          <span style={{ color: "var(--ink-4)" }}>—</span>
                        )}
                      </td>
                      <td
                        className="t-mono"
                        style={{ fontSize: 12, color: "var(--ink-3)" }}
                      >
                        {c.email ?? "—"}
                      </td>
                      <td
                        className="t-mono"
                        style={{ fontSize: 12, color: "var(--ink-3)" }}
                      >
                        {c.phone ?? "—"}
                      </td>
                      <td>
                        {c.dealCount > 0 ? (
                          <span
                            className="chip --mute"
                            style={{ fontFamily: "var(--code)", fontSize: 10.5 }}
                          >
                            {c.dealCount} {c.dealCount === 1 ? "deal" : "deals"}
                          </span>
                        ) : (
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
                        {c.lastActivityAt
                          ? formatRelative(c.lastActivityAt)
                          : formatRelative(c.updatedAt)}
                      </td>
                      <td>
                        <RowActionsMenu
                          viewHref={`/contacts/${c.id}`}
                          editHref={`/contacts/${c.id}/edit`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer — real pagination */}
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
