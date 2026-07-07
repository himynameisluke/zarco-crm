import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { FileText, MoreHorizontal, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { organizations, quotes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { formatDateShort, formatMoney, formatRelative } from "@/lib/format";
import {
  QUOTE_STATUS_CHIP,
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from "./schema";

export default async function QuotesPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const rows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      status: quotes.status,
      totalPence: quotes.totalPence,
      currency: quotes.currency,
      validUntil: quotes.validUntil,
      updatedAt: quotes.updatedAt,
      sentAt: quotes.sentAt,
      acceptedAt: quotes.acceptedAt,
      organizationName: organizations.name,
    })
    .from(quotes)
    .leftJoin(organizations, eq(quotes.organizationId, organizations.id))
    .where(eq(quotes.workspaceId, workspace.id))
    .orderBy(desc(quotes.updatedAt))
    .limit(200);

  const total = rows.length;

  return (
    <>
      <Topbar
        crumbs={[{ icon: FileText, label: "Quotes" }]}
        actions={
          <Link href="/quotes/new" className="btn btn-primary">
            <Plus size={13} />
            New quote
          </Link>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={FileText}
                title="No quotes yet"
                description="Build your first quote — line items, tax, valid-until, public client link."
                action={
                  <Link href="/quotes/new" className="btn btn-primary">
                    <Plus size={13} />
                    New quote
                  </Link>
                }
              />
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Number</th>
                  <th style={{ width: 240 }}>Organization</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 140, textAlign: "right" }}>Total</th>
                  <th style={{ width: 130, textAlign: "right" }}>Valid until</th>
                  <th style={{ width: 110, textAlign: "right" }}>Updated</th>
                  <th style={{ width: 32 }} aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <Link
                        href={`/quotes/${q.id}`}
                        className="t-mono"
                        style={{
                          fontSize: 12.5,
                          color: "var(--ink)",
                          textDecoration: "none",
                        }}
                      >
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td>
                      {q.organizationName ?? (
                        <span style={{ color: "var(--ink-4)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`chip ${QUOTE_STATUS_CHIP[q.status as QuoteStatus]}`}
                      >
                        {QUOTE_STATUS_LABELS[q.status as QuoteStatus]}
                      </span>
                    </td>
                    <td className="t-num" style={{ textAlign: "right" }}>
                      {formatMoney(q.totalPence, q.currency)}
                    </td>
                    <td
                      className="t-mono"
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        color: "var(--ink-3)",
                      }}
                    >
                      {formatDateShort(q.validUntil)}
                    </td>
                    <td
                      className="t-mono"
                      style={{
                        textAlign: "right",
                        fontSize: 11.5,
                        color: "var(--ink-3)",
                      }}
                    >
                      {formatRelative(q.updatedAt)}
                    </td>
                    <td>
                      <RowActionsMenu
                        viewHref={`/quotes/${q.id}`}
                        editHref={`/quotes/${q.id}/edit`}
                      />
                    </td>
                  </tr>
                ))}
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
            <span>{total.toLocaleString("en-GB")} quote{total === 1 ? "" : "s"}</span>
          </div>
        ) : null}
      </main>
    </>
  );
}
