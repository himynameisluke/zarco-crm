import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Layers,
  Plus,
  Search,
  SortAsc,
  Users,
  MoreHorizontal,
} from "lucide-react";

import { db } from "@/lib/db";
import { activities, contacts, deals, organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { colorFromString } from "@/lib/colors";
import { formatRelative, getInitials } from "@/lib/format";

function fullName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed";
}

export default async function ContactsPage() {
  await requireUser();

  const rows = await db
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
    .groupBy(contacts.id, organizations.name)
    .orderBy(desc(contacts.updatedAt))
    .limit(200);

  const total = rows.length;

  return (
    <>
      <Topbar
        crumbs={[{ icon: Users, label: "Contacts" }]}
        actions={
          <>
            <button type="button" className="btn">
              <Download size={13} />
              Export
            </button>
            <Link href="/contacts/new" className="btn btn-primary">
              <Plus size={13} />
              New contact
            </Link>
          </>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        {/* Toolbar */}
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
              placeholder={`Search ${total.toLocaleString("en-GB")} contact${total === 1 ? "" : "s"}…`}
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

        {/* Table or empty state */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={Users}
                title="No contacts yet"
                description="Add your first contact to start building your CRM."
                action={
                  <Link href="/contacts/new" className="btn btn-primary">
                    <Plus size={13} />
                    New contact
                  </Link>
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
                        <button
                          type="button"
                          className="btn-ghost"
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

        {/* Footer */}
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
